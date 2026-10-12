import { escapeHtml } from "./mailer";

function formatCurrency(amount: any) {
  const n = Number(amount?.toString() || 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

const BRAND_COLOR = "#0f172a"; // slate-900 or similar
const BG_COLOR = "#f8fafc";
const TEXT_COLOR = "#334155";

function layout(title: string, content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: ${BG_COLOR}; color: ${TEXT_COLOR}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { color: ${BRAND_COLOR}; margin: 0; font-size: 24px; font-weight: 600; }
    .content { font-size: 16px; line-height: 1.6; color: ${TEXT_COLOR}; }
    .content p { margin-bottom: 16px; margin-top: 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 14px; color: #64748b; }
    .button { display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .table { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 24px; }
    .table th { text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: ${BRAND_COLOR}; }
    .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right !important; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Label Apsáre</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Thank you for choosing Apsara Designer.</p>
      <p><a href="mailto:support@apsaredesigner.in" style="color: #64748b;">support@apsaredesigner.in</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function forgotPasswordTemplate(fullName: string, resetLink: string) {
  const text = `Hi ${fullName},\n\nWe received a request to reset your password. You can reset it by clicking the link below (valid for 30 minutes):\n${resetLink}\n\nIf you didn't ask for this, you can safely ignore this email.\n\nBest regards,\nApsara Designer`;
  
  const html = layout(
    "Reset your password",
    `
    <p>Hi ${escapeHtml(fullName)},</p>
    <p>We received a request to reset your password. You can reset it by clicking the button below (valid for 30 minutes):</p>
    <p style="text-align: center;">
      <a href="${escapeHtml(resetLink)}" class="button">Reset Password</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 14px; color: #64748b;">${escapeHtml(resetLink)}</p>
    <p>If you didn't ask for this, you can safely ignore this email.</p>
    `
  );

  return { text, html };
}

export function orderConfirmationTemplate(order: any, orderUrl: string) {
  const linesText = order.items.map((i: any) => `- ${i.productName} (${i.size}, ${i.color}) x ${i.quantity}: ${formatCurrency(i.salePrice)}`).join("\n");
  const text = `Dear ${order.user.fullName},\n\nThank you for shopping with us!\n\nWe are pleased to inform you that we have received your order successfully.\n\nOrder Details\nOrder Number: ${order.orderNumber}\nProducts Ordered:\n${linesText}\n\nTotal Amount: ${formatCurrency(order.finalAmount)}\nPayment Status: ${order.paymentStatus || 'PENDING'}\nOrder Status: PLACED\n\nTrack your order here: ${orderUrl}\n\nWe will keep you informed about the progress of your order through email notifications whenever its status changes.\n\nBest regards,\nApsara Designer`;

  const itemsHtml = order.items.map((i: any) => `
    <tr>
      <td>${escapeHtml(i.productName)}<br><small style="color:#64748b;">${escapeHtml(i.size)}, ${escapeHtml(i.color)}</small></td>
      <td style="text-align: center;">${i.quantity}</td>
      <td class="text-right">${formatCurrency(i.salePrice)}</td>
    </tr>
  `).join("");

  const html = layout(
    "Order Confirmation",
    `
    <p>Dear ${escapeHtml(order.user.fullName)},</p>
    <p>Thank you for shopping with us!</p>
    <p>We are pleased to inform you that we have received your order successfully.</p>
    
    <h3 style="margin-top: 32px; margin-bottom: 16px; color: ${BRAND_COLOR}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Order Details (<strong>#${escapeHtml(order.orderNumber)}</strong>)</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th class="text-right">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; padding: 12px; font-weight: bold;">Total Amount:</td>
          <td class="text-right" style="padding: 12px; font-weight: bold; border-top: 2px solid #e2e8f0;">${formatCurrency(order.finalAmount)}</td>
        </tr>
      </tfoot>
    </table>
    
    <p><strong>Payment Status:</strong> ${escapeHtml(order.paymentStatus || 'PENDING')} (${escapeHtml(order.paymentMethod)})</p>
    <p><strong>Order Status:</strong> PLACED</p>
    
    <p style="text-align: center;">
      <a href="${escapeHtml(orderUrl)}" class="button">View Order Status</a>
    </p>
    
    <p>We will keep you informed about the progress of your order through email notifications whenever its status changes.</p>
    `
  );

  return { text, html };
}

export function newOrderAdminTemplate(order: any, orderUrl: string) {
  const linesText = order.items.map((i: any) => `- ${i.productName} (${i.size}, ${i.color}) x ${i.quantity}: ${formatCurrency(i.salePrice)}`).join("\n");
  
  const text = `New Order Received – Order #${order.orderNumber}\n\nCustomer Details:\nName: ${order.user.fullName}\nEmail: ${order.user.email}\nContact: ${order.shipMobile || 'N/A'}\n\nShipping Address:\n${order.shipName}\n${order.shipLine1}\n${order.shipLine2 ? order.shipLine2 + '\n' : ''}${order.shipCity}, ${order.shipState} - ${order.shipPincode}\n\nProducts Ordered:\n${linesText}\n\nTotal Amount: ${formatCurrency(order.finalAmount)}\nPayment Method: ${order.paymentMethod}\nPayment Status: ${order.paymentStatus || 'PENDING'}\n\nView details: ${orderUrl}`;

  const itemsHtml = order.items.map((i: any) => `
    <tr>
      <td>${escapeHtml(i.productName)}<br><small style="color:#64748b;">${escapeHtml(i.size)}, ${escapeHtml(i.color)}</small></td>
      <td style="text-align: center;">${i.quantity}</td>
      <td class="text-right">${formatCurrency(i.salePrice)}</td>
    </tr>
  `).join("");

  const html = layout(
    "New Order Received",
    `
    <h2 style="color: ${BRAND_COLOR}; margin-top: 0;">New Order #${escapeHtml(order.orderNumber)}</h2>
    
    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Customer Details</h3>
      <p style="margin: 0;"><strong>Name:</strong> ${escapeHtml(order.user.fullName)}</p>
      <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(order.user.email)}</p>
      <p style="margin: 0;"><strong>Contact:</strong> ${escapeHtml(order.shipMobile || 'N/A')}</p>
    </div>

    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
      <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Shipping Address</h3>
      <p style="margin: 0;">
        ${escapeHtml(order.shipName)}<br>
        ${escapeHtml(order.shipLine1)}<br>
        ${order.shipLine2 ? escapeHtml(order.shipLine2) + '<br>' : ''}
        ${escapeHtml(order.shipCity)}, ${escapeHtml(order.shipState)} - ${escapeHtml(order.shipPincode)}
      </p>
    </div>

    <h3 style="margin-top: 24px; margin-bottom: 16px; color: ${BRAND_COLOR}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Order Details</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th class="text-right">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; padding: 12px; font-weight: bold;">Total Amount:</td>
          <td class="text-right" style="padding: 12px; font-weight: bold; border-top: 2px solid #e2e8f0;">${formatCurrency(order.finalAmount)}</td>
        </tr>
      </tfoot>
    </table>
    
    <p><strong>Payment Method:</strong> ${escapeHtml(order.paymentMethod)}</p>
    <p><strong>Payment Status:</strong> ${escapeHtml(order.paymentStatus || 'PENDING')}</p>
    
    <p style="text-align: center;">
      <a href="${escapeHtml(orderUrl)}" class="button">View Order in Admin Panel</a>
    </p>
    `
  );

  return { text, html };
}

export function orderStatusUpdateTemplate(order: any, oldStatus: string, newStatus: string, note: string | null, orderUrl: string) {
  const text = `Dear ${order.user.fullName},\n\nWe would like to inform you that the status of your order #${order.orderNumber} has been updated.\n\nPrevious Status: ${oldStatus}\nCurrent Status: ${newStatus}\n${note ? `\nNote: ${note}\n` : ''}\nYou can log in to your account to view the complete order details and track your order: ${orderUrl}\n\nThank you for shopping with Apsara Designer.\n\nBest regards,\nApsara Designer`;

  const html = layout(
    `Order Update – #${escapeHtml(order.orderNumber)}`,
    `
    <p>Dear ${escapeHtml(order.user.fullName)},</p>
    <p>We would like to inform you that the status of your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been updated.</p>
    
    <div style="margin: 24px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; background-color: #f8fafc;">
      <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Previous Status</p>
      <p style="margin: 4px 0 16px 0; font-weight: 500; color: #94a3b8; text-decoration: line-through;">${escapeHtml(oldStatus)}</p>
      
      <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Current Status</p>
      <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: ${BRAND_COLOR};">${escapeHtml(newStatus)}</p>
    </div>

    ${note ? `<p style="background-color: #f1f5f9; padding: 16px; border-left: 4px solid ${BRAND_COLOR}; font-style: italic;"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ''}
    
    <p>You can log in to your account to view the complete order details and track your order.</p>
    
    <p style="text-align: center;">
      <a href="${escapeHtml(orderUrl)}" class="button">View Order Details</a>
    </p>
    `
  );

  return { text, html };
}
