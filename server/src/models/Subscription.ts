import { Schema, model, type InferSchemaType } from 'mongoose'

// A reader's books subscription. Written by the payment webhook once checkout
// is wired up; read by hasActiveSubscription() to unlock paid chapters.
const subscriptionSchema = new Schema(
  {
    userId: { type: String, required: true, trim: true, index: true },
    provider: { type: String, required: true, default: 'dodo' },
    providerSubscriptionId: { type: String, trim: true, default: null },
    status: {
      type: String,
      required: true,
      enum: ['active', 'on_hold', 'cancelled', 'expired', 'failed'],
    },
    currentPeriodEnd: { type: Date, required: true },
  },
  { timestamps: true },
)

subscriptionSchema.index({ provider: 1, providerSubscriptionId: 1 }, { unique: true, sparse: true })

export type Subscription = InferSchemaType<typeof subscriptionSchema>

export const SubscriptionModel = model('Subscription', subscriptionSchema)

/** True while the user has a paid-up subscription. Cancelled ones run to the end of the period. */
export async function hasActiveSubscription(userId: string) {
  const found = await SubscriptionModel.exists({
    userId,
    status: { $in: ['active', 'cancelled'] },
    currentPeriodEnd: { $gt: new Date() },
  })
  return Boolean(found)
}
