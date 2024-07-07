const request = require("supertest");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const { Organisation, User, UserOrganisation } = require("../models");
const { app } = require("../server");
const { generateUniqueId } = require("../utils/helpers");
const { generateToken, verifyToken } = require("../utils/jwt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

/* Unit Tests */
describe("Token Generation", () => {
	it("should generate a token that expires in 1 hour and contains correct user details", () => {
		const user = { userId: "user123", email: "user@example.com" };
		const token = generateToken(user);

		const decoded = jwt.decode(token);

		expect(decoded.userId.userId).toBe(user.userId);
		expect(decoded.userId.email).toBe(user.email);

		const verified = verifyToken(token);
		expect(verified.userId.userId).toBe(user.userId);
		expect(verified.userId.email).toBe(user.email);

		const expirationTime = new Date(verified.exp * 1000);
		const currentTime = new Date();
		expect(expirationTime - currentTime).toBeLessThanOrEqual(3600000);
	});
});

/* End-To-End Test */
describe("Auth Endpoints", () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		await User.destroy({ where: {} });
		await Organisation.destroy({ where: {} });
		await UserOrganisation.destroy({ where: {} });
	});

	afterEach(async () => {
		await User.destroy({ where: {} });
	});

	it("should register user successfully with default organisation", async () => {
		const res = await request(app).post("/auth/register").send({
			firstName: "John",
			lastName: "Doe",
			email: "john@example.com",
			password: "password123",
			phone: "1234567890",
		});

		expect(res.statusCode).toEqual(201);
		expect(res.body).toHaveProperty("data");
		expect(res.body.data.user.firstName).toEqual("John");
		expect(res.body.data.user.email).toEqual("john@example.com");
		expect(res.body.data).toHaveProperty("accessToken");

		const createdOrganisation = await Organisation.findOne({
			where: { name: "John's Organisation" },
		});
		expect(createdOrganisation).not.toBeNull();
		expect(createdOrganisation.name).toEqual("John's Organisation");
	});

	describe("should fail if required fields are missing", () => {
		it("should fail if firstName is missing", async () => {
			const res = await request(app).post("/auth/register").send({
				lastName: "Doe",
				email: "john@example.com",
				password: "password123",
				phone: "1234567890",
			});

			expect(res.statusCode).toEqual(422);
			expect(res.body).toHaveProperty("errors");
			expect(res.body.errors).toContainEqual({
				field: "firstName",
				message: "First name is required",
			});
		});

		it("should fail if lastName is missing", async () => {
			const res = await request(app).post("/auth/register").send({
				firstName: "John",
				email: "john@example.com",
				password: "password123",
				phone: "1234567890",
			});

			expect(res.statusCode).toEqual(422);
			expect(res.body).toHaveProperty("errors");
			expect(res.body.errors).toContainEqual({
				field: "lastName",
				message: "Last name is required",
			});
		});

		it("should fail if email is missing", async () => {
			const res = await request(app).post("/auth/register").send({
				firstName: "John",
				lastName: "Doe",
				password: "password123",
				phone: "1234567890",
			});

			expect(res.statusCode).toEqual(422);
			expect(res.body).toHaveProperty("errors");
			expect(res.body.errors).toContainEqual({
				field: "email",
				message: "Email is required",
			});
		});

		it("should fail if password is missing", async () => {
			const res = await request(app).post("/auth/register").send({
				firstName: "John",
				lastName: "Doe",
				email: "john@example.com",
				phone: "1234567890",
			});

			expect(res.statusCode).toEqual(422);
			expect(res.body).toHaveProperty("errors");
			expect(res.body.errors).toContainEqual({
				field: "password",
				message: "Password is required",
			});
		});
	});

	it("should log the user in successfully if valid credentials is provided", async () => {
		const password = "password123";
		const hashedPassword = await bcrypt.hash(password, 10);

		const mockUserFindOne = jest.spyOn(User, "findOne").mockResolvedValue({
			userId: generateUniqueId("John-Doe"),
			firstName: "John",
			lastName: "Doe",
			email: "john@example.com",
			password: hashedPassword,
			phone: "1234567890",
		});

		const res = await request(app).post("/auth/login").send({
			email: "john@example.com",
			password,
		});

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveProperty("data");
		expect(res.body.data.user.email).toEqual("john@example.com");
		expect(res.body.data).toHaveProperty("accessToken");
		expect(mockUserFindOne).toHaveBeenCalledWith({
			where: { email: "john@example.com" },
		});
	});

	it("should fail if invalid login credentials is provided", async () => {
		const password = "wrongpassword";
		const realPassword = "password123";
		const hashedPassword = await bcrypt.hash(realPassword, 10);

		jest.spyOn(User, "findOne").mockResolvedValue({
			userId: generateUniqueId("John-Doe"),
			firstName: "John",
			lastName: "Doe",
			email: "john@example.com",
			password: hashedPassword,
			phone: "1234567890",
		});

		const res = await request(app).post("/auth/login").send({
			email: "john@example.com",
			password,
		});
		expect(res.statusCode).toEqual(401);
	});

	it("should fail if there’s duplicate email or userID", async () => {
		const mockUserCreate = jest.spyOn(User, "create").mockRejectedValue({
			name: "SequelizeUniqueConstraintError",
			errors: [{ message: "Duplicate entry" }],
		});

		const res = await request(app).post("/auth/register").send({
			firstName: "John",
			lastName: "Doe",
			email: "john@example.com",
			password: "password123",
			phone: "1234567890",
		});

		expect(res.statusCode).toEqual(422);
		expect(res.body).toHaveProperty("errors");
	});
});
