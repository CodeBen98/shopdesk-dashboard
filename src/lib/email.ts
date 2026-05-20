import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}
const FROM = 'ShopDesk <support@shopdesk.site>'

export async function sendProvisioningStarted({
  to,
  shopName,
}: {
  to: string
  shopName: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `ShopDesk is setting up your receptionist`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="padding: 40px 0 24px;">
          <span style="font-weight: 800; font-size: 18px; letter-spacing: -0.3px;">ShopDesk</span>
        </div>

        <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">
          We're setting up your receptionist
        </h1>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Hi ${shopName},
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          We're configuring your AI receptionist now. This usually takes about 30 seconds. You'll get another email as soon as it's live with instructions to activate call forwarding.
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 24px;">
          You don't need to do anything yet.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
          ShopDesk &mdash; Never miss another call<br />
          <a href="https://shopdesk.site" style="color: #9ca3af;">shopdesk.site</a>
        </p>
      </div>
    `,
  })
}

export async function sendProvisioningComplete({
  to,
  shopName,
  twilioNumber,
}: {
  to: string
  shopName: string
  twilioNumber: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your receptionist is live — activate call forwarding`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="padding: 40px 0 24px;">
          <span style="font-weight: 800; font-size: 18px; letter-spacing: -0.3px;">ShopDesk</span>
        </div>

        <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">
          Your receptionist is live
        </h1>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Hi ${shopName},
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Your ShopDesk receptionist is configured and ready. One step left: activate call forwarding so missed calls route to us automatically.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
          <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0 0 8px;">
            Your ShopDesk number
          </p>
          <p style="font-size: 22px; font-weight: 800; color: #14532d; margin: 0 0 16px; letter-spacing: -0.5px;">
            ${twilioNumber}
          </p>
          <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0 0 6px;">
            To activate forwarding from your business phone:
          </p>
          <p style="font-size: 15px; color: #166534; margin: 0;">
            Dial <strong>*72${twilioNumber}</strong> and press Call.<br />
            <span style="font-size: 13px; opacity: 0.8;">(AT&amp;T, Verizon, T-Mobile)</span>
          </p>
        </div>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Once forwarding is active, every call your team misses will be answered by your receptionist. You'll get an email each time a booking is made.
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 24px;">
          You can see all your results at <a href="https://app.shopdesk.site/dashboard" style="color: #0f7695;">app.shopdesk.site</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
          ShopDesk &mdash; Never miss another call<br />
          <a href="https://shopdesk.site" style="color: #9ca3af;">shopdesk.site</a>
        </p>
      </div>
    `,
  })
}

export async function sendCancellationNotice({
  to,
  shopName,
  deleteDate,
}: {
  to: string
  shopName: string
  deleteDate: string
}) {
  const formatted = new Date(deleteDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your ShopDesk account is scheduled for cancellation`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="padding: 40px 0 24px;">
          <span style="font-weight: 800; font-size: 18px; letter-spacing: -0.3px;">ShopDesk</span>
        </div>

        <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">
          Your account has been scheduled for cancellation
        </h1>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Hi ${shopName},
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          We have received a cancellation request for your ShopDesk account. Your AI receptionist service will remain active during the 30-day grace period.
        </p>

        <div style="background: #fff8f0; border: 1px solid #f59e0b; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
          <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 4px;">
            Account scheduled for deletion
          </p>
          <p style="font-size: 15px; font-weight: 700; color: #78350f; margin: 0;">
            ${formatted}
          </p>
        </div>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          After this date, your dedicated phone number will be released and all account data will be permanently removed.
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 24px;">
          Changed your mind? Reply to this email or contact us at
          <a href="mailto:support@shopdesk.site" style="color: #0f7695;">support@shopdesk.site</a>
          and we will restore your account immediately.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
          ShopDesk &mdash; Never miss another call<br />
          <a href="https://shopdesk.site" style="color: #9ca3af;">shopdesk.site</a>
        </p>
      </div>
    `,
  })
}

export async function sendDeletionConfirmation({
  to,
  shopName,
}: {
  to: string
  shopName: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your ShopDesk account has been deleted`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="padding: 40px 0 24px;">
          <span style="font-weight: 800; font-size: 18px; letter-spacing: -0.3px;">ShopDesk</span>
        </div>

        <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">
          Your account has been deleted
        </h1>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Hi ${shopName},
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Your ShopDesk account for <strong>${shopName}</strong> has been permanently deleted. Here is what has been removed:
        </p>

        <ul style="font-size: 15px; line-height: 2; color: #444; padding-left: 20px; margin-bottom: 24px;">
          <li>Your dedicated AI receptionist phone number</li>
          <li>All call history and recordings</li>
          <li>All booking records</li>
          <li>Your account and login credentials</li>
        </ul>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 24px;">
          If you believe this was done in error or would like to reactivate service in the future, contact us at
          <a href="mailto:support@shopdesk.site" style="color: #0f7695;">support@shopdesk.site</a>.
        </p>

        <p style="font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 16px;">
          Thank you for using ShopDesk. We hope to serve you again in the future.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
          ShopDesk &mdash; Never miss another call<br />
          <a href="https://shopdesk.site" style="color: #9ca3af;">shopdesk.site</a>
        </p>
      </div>
    `,
  })
}
