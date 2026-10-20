'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { toQuery } from './admin-schema';
import { firstError } from './auth-schema';
import { adminOrderFilterSchema, createOrderSchema, orderIdSchema, savePackageSchema } from './billing-schema';
import type { ActionResult, AdminOrder, Order, OrderStatus, Page, ServicePackage } from './types';

// PAYMENT IS SIMULATED (contract §47): no gateway, no money taken. FastAPI and the database re-check every rule.

/** Active packages, cheapest first. */
export async function listPackages(): Promise<ServicePackage[]> {
  return readOr(await apiFetch<ServicePackage[]>('/packages', { auth: false }), []);
}

/** Employer; the posting must be their own open one; amount = the package price now; one PENDING order per posting. */
export async function createOrderAction(input: { packageId: string; postingId: string }): Promise<ActionResult<Order>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<Order>('/me/orders', { method: 'POST', body: parsed.data }));
}

/** SIMULATED payment: PENDING → PAID; featuredUntil = max(now, featuredUntil) + durationDays; notifies ORDER_PAID. */
export async function payOrderAction(input: { orderId: string }): Promise<ActionResult<Order>> {
  const parsed = orderIdSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<Order>(`/me/orders/${parsed.data.orderId}/pay`, { method: 'POST' }));
}

/** PENDING only. */
export async function cancelOrderAction(input: { orderId: string }): Promise<ActionResult<Order>> {
  const parsed = orderIdSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  return toAction(await apiFetch<Order>(`/me/orders/${parsed.data.orderId}/cancel`, { method: 'POST' }));
}

/** The Employer's orders, newest first; [] for anyone else. */
export async function listMyOrders(): Promise<Order[]> {
  return readOr(await apiFetch<Order[]>('/me/orders'), []);
}

// Admin: not ADMIN → null (reads) / the API's 403 message (writes).

/** Every package, inactive included. */
export async function listAdminPackages(): Promise<ServicePackage[] | null> {
  return readOr(await apiFetch<ServicePackage[]>('/admin/packages'), null);
}

/** Create (no id) or update; writes the PACKAGE_UPDATED audit entry. */
export async function savePackageAction(input: {
  id?: string; code: string; name: string; description: string; priceVnd: number; durationDays: number; active: boolean;
}): Promise<ActionResult<ServicePackage>> {
  const parsed = savePackageSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { id, ...body } = parsed.data;
  return toAction(
    await apiFetch<ServicePackage>(id ? `/admin/packages/${id}` : '/admin/packages', { method: id ? 'PUT' : 'POST', body }),
  );
}

/** Every order, newest first, 20 per page. */
export async function listAdminOrders(filter: { status?: OrderStatus; page?: number }): Promise<Page<AdminOrder> | null> {
  return readOr(await apiFetch<Page<AdminOrder>>(`/admin/orders?${toQuery(adminOrderFilterSchema.parse(filter))}`), null);
}
