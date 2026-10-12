import { env } from "../../config/env";
import type { OrderStatus } from "../../../generated/prisma/client";
import { escapeHtml, keepAlive, sendMail } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";
import { orderConfirmationTemplate, newOrderAdminTemplate, orderStatusUpdateTemplate } from "../../lib/email-templates";

// Order emails. All helpers are fire-and-forget: they return immediately, and a
// failed lookup or send is only logged, so an email can never fail an order.

const label = (status: OrderStatus | string) => status.toString().toUpperCase();

function loadOrder(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      finalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      shipName: true,
      shipMobile: true,
      shipLine1: true,
      shipLine2: true,
      shipCity: true,
      shipState: true,
      shipPincode: true,
      user: { select: { fullName: true, email: true } },
      items: { select: { productName: true, size: true, color: true, quantity: true, salePrice: true }, orderBy: { id: "asc" } },
    },
  });
}

/** Starts the lookup + send now and keeps it alive past the response (after(), see mailer.ts). */
function run(task: () => Promise<void>, what: string) {
  keepAlive(task().catch((err: unknown) => console.error(`[mail] ${what} failed`, err)));
}

/** "Order placed" confirmation to the customer. */
export function notifyOrderPlaced(orderNumber: string): void {
  run(async () => {
    const order = await loadOrder(orderNumber);
    if (!order) return;
    const url = `${env.clientUrl}/account/orders/${order.orderNumber}`;
    
    const { text, html } = orderConfirmationTemplate(order, url);

    await sendMail({
      to: order.user.email,
      subject: `We Have Received Your Order – Order #${order.orderNumber}`,
      text,
      html,
    });
  }, `order confirmation ${orderNumber}`);
}

/** "New Order" notification to the admin/website owner. */
export function notifyAdminNewOrder(orderNumber: string): void {
  run(async () => {
    const order = await loadOrder(orderNumber);
    if (!order) return;
    
    // Admin url might be different, but for now we'll send them to the admin dashboard or similar
    const url = `${env.clientUrl}/admin/orders/${order.orderNumber}`;
    const { text, html } = newOrderAdminTemplate(order, url);

    await sendMail({
      to: env.mail.adminEmail,
      subject: `New Order Received – Order #${order.orderNumber}`,
      text,
      html,
    });
  }, `admin new order notification ${orderNumber}`);
}

/** Status change (confirmed, shipped, delivered, cancelled…) to the customer. */
export function notifyOrderStatus(orderNumber: string, status: OrderStatus, oldStatus?: OrderStatus | string, note?: string | null): void {
  run(async () => {
    const order = await loadOrder(orderNumber);
    if (!order) return;
    const url = `${env.clientUrl}/account/orders/${order.orderNumber}`;
    
    const currentLabel = label(status);
    const previousLabel = oldStatus ? label(oldStatus) : "PREVIOUS STATUS";

    const { text, html } = orderStatusUpdateTemplate(order, previousLabel, currentLabel, note || null, url);

    await sendMail({
      to: order.user.email,
      subject: `Order Update – Order #${order.orderNumber} Is Now ${currentLabel}`,
      text,
      html,
    });
  }, `order status email ${orderNumber}`);
}
