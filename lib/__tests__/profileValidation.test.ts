import {
  PROFILE_NAME_MAX_LENGTH,
  normalizeProfileName,
  validateProfileName,
} from "../profileValidation";

describe("profile-name validation", () => {
  it("trims and NFC-normalizes Unicode names", () => {
    const decomposed = "  Ame\u0301lia  ";

    expect(normalizeProfileName(decomposed)).toBe("Amélia");
    expect(validateProfileName(decomposed)).toEqual({
      value: "Amélia",
      error: null,
    });
  });

  it("rejects blank, control-character, and overlong names", () => {
    expect(validateProfileName(" \t ")).toEqual({
      value: "",
      error: "Enter a name.",
    });
    expect(validateProfileName("Amina\nParent").error).toContain(
      "unsupported control characters",
    );
    expect(
      validateProfileName("a".repeat(PROFILE_NAME_MAX_LENGTH + 1)).error,
    ).toContain(`${PROFILE_NAME_MAX_LENGTH} characters`);
  });

  it("counts Unicode code points rather than UTF-16 code units", () => {
    const name = "👩".repeat(PROFILE_NAME_MAX_LENGTH);
    expect(validateProfileName(name).error).toBeNull();
  });
});
