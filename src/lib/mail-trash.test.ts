import { describe, expect, it } from "vitest";
import { getTrashPresentation, resolveMailScope, resolveMailView } from "./mail-trash";

const base = {
  senderId: "sender",
  recipientId: "recipient",
  isDraft: false,
  deletedBySender: false,
  deletedByRecipient: false,
  purgedBySender: false,
  purgedByRecipient: false,
};

describe("getTrashPresentation", () => {
  it("identifies a received message deleted from inbox", () => {
    expect(getTrashPresentation({ ...base, deletedByRecipient: true }, "recipient"))
      .toEqual({ scope: "recipient", origin: "bandeja" });
  });

  it("identifies a sent message deleted from sent mail", () => {
    expect(getTrashPresentation({ ...base, deletedBySender: true }, "sender"))
      .toEqual({ scope: "sender", origin: "enviados" });
  });

  it("keeps the correct side when sender and recipient are the same user", () => {
    const selfMessage = { ...base, senderId: "self", recipientId: "self", deletedByRecipient: true };
    expect(getTrashPresentation(selfMessage, "self"))
      .toEqual({ scope: "recipient", origin: "bandeja" });
  });

  it("collapses legacy self-messages deleted on both sides into one trash row", () => {
    const legacyMessage = {
      ...base,
      senderId: "self",
      recipientId: "self",
      deletedBySender: true,
      deletedByRecipient: true,
    };
    expect(getTrashPresentation(legacyMessage, "self"))
      .toEqual({ scope: "both", origin: "enviados" });
  });

  it("ignores a purged side", () => {
    expect(getTrashPresentation({ ...base, deletedByRecipient: true, purgedByRecipient: true }, "recipient"))
      .toBeNull();
  });
});

describe("resolveMailScope", () => {
  it("never deletes the sender copy when the recipient deletes for themselves", () => {
    expect(resolveMailScope("recipient", false, true))
      .toEqual({ affectSender: false, affectRecipient: true });
  });

  it("deletes only the inbox side of a self-message", () => {
    expect(resolveMailScope("recipient", true, true))
      .toEqual({ affectSender: false, affectRecipient: true });
  });

  it("deletes only the sent side of a self-message", () => {
    expect(resolveMailScope("sender", true, true))
      .toEqual({ affectSender: true, affectRecipient: false });
  });

  it("allows both sides only when both belong to the current user", () => {
    expect(resolveMailScope("both", true, true))
      .toEqual({ affectSender: true, affectRecipient: true });
    expect(resolveMailScope("both", true, false)).toBeNull();
  });

  it("preserves the legacy role-based fallback when scope is omitted", () => {
    expect(resolveMailScope(null, false, true))
      .toEqual({ affectSender: false, affectRecipient: true });
  });
});

describe("resolveMailView", () => {
  it("keeps the sent view accessible after deleting the inbox side of a self-message", () => {
    const selfMessage = {
      isSender: true,
      isRecipient: true,
      deletedBySender: false,
      deletedByRecipient: true,
    };
    expect(resolveMailView("sender", selfMessage)).toBe("sender");
    expect(resolveMailView("recipient", selfMessage)).toBeNull();
  });

  it("keeps the sender copy hidden only when the sender deleted it", () => {
    expect(resolveMailView("sender", {
      isSender: true,
      isRecipient: false,
      deletedBySender: true,
      deletedByRecipient: false,
    })).toBeNull();
  });

  it("prefers inbox for old links and falls back to sent when inbox was deleted", () => {
    expect(resolveMailView(null, {
      isSender: true,
      isRecipient: true,
      deletedBySender: false,
      deletedByRecipient: false,
    })).toBe("recipient");
    expect(resolveMailView(null, {
      isSender: true,
      isRecipient: true,
      deletedBySender: false,
      deletedByRecipient: true,
    })).toBe("sender");
  });
});
