import type { Prisma, ServiceType } from "@prisma/client";

type PaidServiceTx = Prisma.TransactionClient;

export async function applyPaidServiceEntitlements(
  tx: PaidServiceTx,
  userId: string,
  serviceType: ServiceType,
): Promise<void> {
  if (serviceType !== "VERIFIED_BADGE" && serviceType !== "PREMIUM_BADGE") {
    return;
  }

  await tx.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });
}