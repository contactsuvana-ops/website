import admin from "firebase-admin";
import {
  getEstimatesRepository,
  getEstimateSectionsRepository,
  getEstimateLineItemsRepository,
  getPortalRepository,
  getCustomersRepository,
  getProjectsRepository,
  getProjectScopesRepository,
  getProjectMilestonesRepository,
  getActivitiesRepository,
  getProjectChartersRepository,
  type ScopeLineItemRef,
  type ScopeSectionRef,
} from "../db";
import { computeLineTotals, computeEstimateTotals } from "./pricing";
import { logger } from "./logger";

const DEFAULT_MILESTONES = [
  "Planning",
  "Demolition",
  "Rough Work",
  "Inspection",
  "Finish Work",
  "Final Walkthrough",
  "Closeout",
];

export interface ConversionResult {
  projectId: string;
  projectNumber: string;
  customerId: string;
  scopeId: string;
  charterId: string;
}

export async function convertEstimateToProject(
  estimateId: string
): Promise<ConversionResult> {
  const estimateRepo = getEstimatesRepository();
  const estimate = await estimateRepo.getEstimate(estimateId);
  if (!estimate) throw new Error("Estimate not found");
  if (estimate.status !== "accepted") {
    throw new Error("Estimate must be in accepted status to convert");
  }

  const [sections, items] = await Promise.all([
    getEstimateSectionsRepository().listSections(estimateId),
    getEstimateLineItemsRepository().listItems(estimateId),
  ]);

  const actions = await getPortalRepository().listActions(estimateId);
  const acceptAction = actions.find((a) => a.action === "accept");
  const acceptedOptionalIds: string[] =
    (acceptAction?.payload as { selectedOptionalIds?: string[] })?.selectedOptionalIds ?? [];
  const acceptedAt =
    acceptAction?.createdAt != null
      ? (acceptAction.createdAt as admin.firestore.Timestamp)
      : admin.firestore.Timestamp.now();

  // Treat accepted optionals as included for total computation
  const itemsForTotals = items.map((item) => ({
    ...item,
    isOptional: item.isOptional && !acceptedOptionalIds.includes(item.id),
  }));
  const totals = computeEstimateTotals(itemsForTotals, {
    taxRate: estimate.taxRate,
    markupPct: estimate.markupPct,
    depositPct: estimate.depositPct,
    discountAmount: estimate.discountAmount,
  });

  // ── 1. Create customer ────────────────────────────────────────────────────
  const customer = await getCustomersRepository().createCustomer({
    displayName: estimate.customerName,
    status: "active",
    contacts: [
      {
        name: estimate.customerName,
        email: estimate.customerEmail,
        ...(estimate.customerPhone ? { phone: estimate.customerPhone } : {}),
        isPrimary: true,
      },
    ],
    properties: estimate.projectAddress
      ? [{ address: estimate.projectAddress }]
      : [],
    tags: [],
    billingEmail: estimate.customerEmail,
    sourceEstimateId: estimateId,
  });

  // ── 2. Generate project number ────────────────────────────────────────────
  const projectNumber = await allocateProjectNumber();

  // ── 3. Create project ─────────────────────────────────────────────────────
  const project = await getProjectsRepository().createProject({
    name: estimate.title,
    description: estimate.description ?? "",
    status: "planning",
    clientName: estimate.customerName,
    clientEmail: estimate.customerEmail ?? customer.billingEmail ?? "",
    customerId: customer.id,
    projectNumber,
    sourceEstimateId: estimateId,
    sourceEstimateVersion: estimate.currentVersionNumber,
    propertyAddress: estimate.projectAddress ?? undefined,
    contractValue: totals.grandTotal,
    priority: "normal",
    tags: [],
    crewIds: [],
  });

  // ── 4. Build scope snapshot ───────────────────────────────────────────────
  const scopeLineItems: ScopeLineItemRef[] = items.map((item) => {
    const lineTotals = computeLineTotals({
      qty: item.qty,
      laborUnitPrice: item.laborUnitPrice,
      materialUnitPrice: item.materialUnitPrice,
      markupPct: item.markupPct,
      ...(item.discountPct != null ? { discountPct: item.discountPct } : {}),
    });
    return {
      id: item.id,
      sectionId: item.sectionId,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      laborUnitPrice: item.laborUnitPrice,
      materialUnitPrice: item.materialUnitPrice,
      markupPct: item.markupPct,
      isOptional: item.isOptional,
      isIncluded: !item.isOptional || acceptedOptionalIds.includes(item.id),
      lineTotal: lineTotals.lineTotal,
      ...(item.discountPct != null ? { discountPct: item.discountPct } : {}),
      ...(item.notes ? { notes: item.notes } : {}),
    };
  });

  const scopeSections: ScopeSectionRef[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    position: s.position,
    ...(s.notes ? { notes: s.notes } : {}),
  }));

  const scope = await getProjectScopesRepository().createScope({
    projectId: project.id,
    estimateId,
    estimateVersionNumber: estimate.currentVersionNumber,
    estimateTitle: estimate.title,
    taxRate: estimate.taxRate,
    depositPct: estimate.depositPct,
    sections: scopeSections,
    lineItems: scopeLineItems,
    totals: {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      depositAmount: totals.depositAmount,
      laborCost: totals.laborCost,
      materialCost: totals.materialCost,
    },
    contractValue: totals.grandTotal,
    acceptedOptionalIds,
    acceptedAt,
  });

  // ── 5. Link scope to project ──────────────────────────────────────────────
  await getProjectsRepository().updateProject(project.id, { scopeId: scope.id });

  // ── 6. Create default milestones ──────────────────────────────────────────
  const milestonesRepo = getProjectMilestonesRepository();
  for (let i = 0; i < DEFAULT_MILESTONES.length; i++) {
    await milestonesRepo.createMilestone({
      projectId: project.id,
      title: DEFAULT_MILESTONES[i],
      status: "not_started",
      position: i,
      dependsOn: [],
    });
  }

  // ── 7. Create activity entry ──────────────────────────────────────────────
  await getActivitiesRepository().addActivity({
    projectId: project.id,
    type: "estimate_converted",
    actorId: "admin",
    summary: `Project created from estimate "${estimate.title}"`,
    payload: {
      estimateId,
      estimateTitle: estimate.title,
      contractValue: totals.grandTotal,
      projectNumber,
    },
  });

  // ── 8. Draft charter ──────────────────────────────────────────────────────
  const charter = await getProjectChartersRepository().createCharter({
    projectId: project.id,
    status: "draft",
    version: 1,
    summary: `Project charter for ${estimate.title}`,
    customerSummary: `Customer: ${estimate.customerName}`,
    scopeSummary: estimate.description ?? "",
    milestones: DEFAULT_MILESTONES.map((title) => ({ title })),
  });

  await getProjectsRepository().updateProject(project.id, { charterId: charter.id });

  // ── 9. Mark estimate converted ────────────────────────────────────────────
  await estimateRepo.transitionStatus(estimateId, "converted_to_project");

  logger.info({ projectId: project.id, estimateId, projectNumber }, "Estimate converted to project");

  return {
    projectId: project.id,
    projectNumber,
    customerId: customer.id,
    scopeId: scope.id,
    charterId: charter.id,
  };
}

async function allocateProjectNumber(): Promise<string> {
  const firestore = admin.firestore();
  const counterRef = firestore.collection("config").doc("projectCounter");

  let number = 1;
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data() as { lastNumber: number }).lastNumber : 0;
    number = current + 1;
    tx.set(counterRef, { lastNumber: number }, { merge: true });
  });

  const year = new Date().getFullYear();
  return `PRJ-${year}-${String(number).padStart(4, "0")}`;
}
