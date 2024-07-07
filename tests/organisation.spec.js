const { UserOrganisation, Organisation } = require("../models");

const getOrganisationData = async (userId, orgId) => {
	const userOrg = await UserOrganisation.findOne({
		where: { userId, orgId },
	});
	if (!userOrg) {
		throw new Error("User does not have access to this organisation");
	}
	return Organisation.findOne({ where: { orgId } });
};

jest.mock("../models", () => ({
	UserOrganisation: {
		findOne: jest.fn(),
	},
	Organisation: {
		findOne: jest.fn(),
	},
}));

describe("Organisation Service", () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it("should throw an error if user does not have access to the organisation", async () => {
		UserOrganisation.findOne.mockResolvedValue(null);

		await expect(getOrganisationData("user123", "org123")).rejects.toThrow(
			"User does not have access to this organisation"
		);
	});

	it("should return organisation data if user has access", async () => {
		const orgData = { orgId: "org123", name: "Test Org" };
		UserOrganisation.findOne.mockResolvedValue({
			userId: "user123",
			orgId: "org123",
		});
		Organisation.findOne.mockResolvedValue(orgData);

		const result = await getOrganisationData("user123", "org123");
		expect(result).toEqual(orgData);
	});
});
