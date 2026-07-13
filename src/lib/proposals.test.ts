import { describe, expect, it } from "vitest";
import { proposalCounterpartyId } from "./proposals";

describe("private proposal conversations", () => {
  it("only resolves the other participant for the author or content owner", () => {
    const base = { authorId: "author", targetOwnerId: "owner" };
    expect(proposalCounterpartyId({ ...base, currentUserId: "author" })).toBe("owner");
    expect(proposalCounterpartyId({ ...base, currentUserId: "owner" })).toBe("author");
    expect(proposalCounterpartyId({ ...base, currentUserId: "outsider" })).toBeNull();
  });
});
