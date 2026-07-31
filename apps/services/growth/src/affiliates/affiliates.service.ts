import { Injectable } from "@nestjs/common";
import { TOPICS, type AffiliateApplyReq } from "@heropips/contracts";
import { maskEmail } from "../common/position";
import { db } from "../db/client";
import { affiliateApplications, outbox } from "../db/schema";
import { makeEnvelope } from "../outbox/outbox.service";

@Injectable()
export class AffiliatesService {
  async apply(req: AffiliateApplyReq): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(affiliateApplications).values({
        name: req.name,
        email: req.email,
        channel: req.channel,
        audienceSize: req.audience_size,
        geo: req.geo,
        note: req.note ?? null,
      });
      await tx.insert(outbox).values({
        topic: TOPICS.growthEvents,
        payload: makeEnvelope("affiliate.applied", {
          email_masked: maskEmail(req.email),
          channel: req.channel,
          audience_size: req.audience_size,
          geo: req.geo,
        }),
      });
    });
  }
}
