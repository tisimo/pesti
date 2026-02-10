import { UserEmail } from "../../../domain/userEmail";

describe("UserEmail Value Object", () => {
  describe("UserEmail.create()", () => {
    it("should successfully create a UserEmail with valid email", () => {
      const result = UserEmail.create("user@example.com");
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeInstanceOf(UserEmail);
    });

    it("should fail when email is null", () => {
      const result = UserEmail.create(null as any);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("email");
    });

    it("should fail when email is undefined", () => {
      const result = UserEmail.create(undefined as any);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("email");
    });

    it("should create email with various formats", () => {
      const validEmails = [
        "simple@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "first.last@subdomain.example.com",
        "test123@test.org",
      ];

      validEmails.forEach((email) => {
        const result = UserEmail.create(email);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(email);
      });
    });
  });

  describe("UserEmail Getters", () => {
    it("should return correct email value", () => {
      const emailAddress = "john@example.com";
      const result = UserEmail.create(emailAddress);
      const userEmail = result.getValue();

      expect(userEmail.value).toBe(emailAddress);
    });

    it("should preserve email case", () => {
      const emailAddress = "John.Doe@Example.COM";
      const result = UserEmail.create(emailAddress);
      const userEmail = result.getValue();

      expect(userEmail.value).toBe(emailAddress);
    });
  });

  describe("UserEmail Immutability", () => {
    it("should not allow email value modification", () => {
      const result = UserEmail.create("original@example.com");
      const userEmail = result.getValue();

      const originalValue = userEmail.value;
      expect(userEmail.value).toBe("original@example.com");

      // Try to modify (should throw because value is read-only)
      expect(() => {
        (userEmail as any).value = "modified@example.com";
      }).toThrow();

      // Value should remain unchanged
      expect(userEmail.value).toBe(originalValue);
      expect(userEmail.value).toBe("original@example.com");
    });
  });

  describe("UserEmail Equality", () => {
    it("should consider two emails with same value as equal", () => {
      const email1Result = UserEmail.create("same@example.com");
      const email2Result = UserEmail.create("same@example.com");

      const email1 = email1Result.getValue();
      const email2 = email2Result.getValue();

      // Value objects should be equal if their values are equal
      expect(email1.value).toBe(email2.value);
    });

    it("should consider two emails with different values as not equal", () => {
      const email1Result = UserEmail.create("user1@example.com");
      const email2Result = UserEmail.create("user2@example.com");

      const email1 = email1Result.getValue();
      const email2 = email2Result.getValue();

      expect(email1.value).not.toBe(email2.value);
    });
  });

  describe("UserEmail with special characters", () => {
    it("should handle emails with numbers", () => {
      const result = UserEmail.create("user123@example.com");
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe("user123@example.com");
    });

    it("should handle emails with dots and hyphens", () => {
      const result = UserEmail.create("first.last-name@example.com");
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe("first.last-name@example.com");
    });

    it("should handle emails with plus sign", () => {
      const result = UserEmail.create("user+notification@example.com");
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe("user+notification@example.com");
    });

    it("should handle emails with underscore", () => {
      const result = UserEmail.create("user_name@example.com");
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe("user_name@example.com");
    });
  });

  describe("UserEmail with multiple domains", () => {
    const validEmails = [
      "user@gmail.com",
      "user@yahoo.com",
      "user@outlook.com",
      "user@company.com",
      "user@example.co.uk",
      "user@example.com.br",
      "user@localhost.local",
    ];

    validEmails.forEach((email) => {
      it(`should accept email: ${email}`, () => {
        const result = UserEmail.create(email);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(email);
      });
    });
  });

  describe("UserEmail with whitespace", () => {
    it("should handle email with leading/trailing whitespace as provided", () => {
      const emailWithSpaces = " user@example.com ";
      const result = UserEmail.create(emailWithSpaces);
      expect(result.getValue().value).toBe(emailWithSpaces);
    });
  });
});
