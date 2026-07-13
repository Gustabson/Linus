import { describe, expect, it } from "vitest";
import { canAttachTree } from "./tree-hierarchy";

describe("tree hierarchy", () => {
  it("lets kernels contain modules and resources only", () => {
    expect(canAttachTree("KERNEL", "KERNEL")).toBe(false);
    expect(canAttachTree("KERNEL", "MODULE")).toBe(true);
    expect(canAttachTree("KERNEL", "RESOURCE")).toBe(true);
  });

  it("lets modules contain resources only", () => {
    expect(canAttachTree("MODULE", "KERNEL")).toBe(false);
    expect(canAttachTree("MODULE", "MODULE")).toBe(false);
    expect(canAttachTree("MODULE", "RESOURCE")).toBe(true);
  });

  it("never lets resources contain another tree", () => {
    expect(canAttachTree("RESOURCE", "KERNEL")).toBe(false);
    expect(canAttachTree("RESOURCE", "MODULE")).toBe(false);
    expect(canAttachTree("RESOURCE", "RESOURCE")).toBe(false);
  });
});
