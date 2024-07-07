const { User, Organisation, UserOrganisation } = require("../models");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const { generateUniqueId } = require("../utils/helpers");
const { successHandler } = require("../middleware/successHandlerMiddleware");
const { errorHandler } = require("../middleware/errHandlerMiddleware");

const errorMsgMap = {
	firstName: "First name",
	lastName: "Last name",
	email: "Email",
	password: "Password",
};

const register = async (req, res) => {
	const { firstName, lastName, email, password, phone } = req.body;
	const requiredFields = ["firstName", "lastName", "email", "password"];
	const errors = [];

	requiredFields.forEach((field) => {
		if (!req.body[field]) {
			errors.push({
				field,
				message: `${errorMsgMap[field]} is required`,
			});
		}
	});

	if (errors.length > 0) {
		return res.status(422).json({ errors });
	}

	const userId = generateUniqueId(`${firstName}-${lastName}`);
	const userByEmail = await User.findOne({ where: { email } });
	const userById = await User.findByPk(userId);

	if (userByEmail || userById) {
		return res
			.status(422)
			.json({
				errors: [{ field: "email", message: "Duplicate email!" }],
			});
	}

	const hashedPassword = await hashPassword(password);
	try {
		const user = await User.create({
			userId,
			firstName,
			lastName,
			email,
			password: hashedPassword,
			phone,
		});

		const organisation = await Organisation.create({
			orgId: generateUniqueId(`${firstName.toLowerCase()}-org`),
			name: `${firstName}'s Organisation`,
		});

		await UserOrganisation.create({
			userId: user.userId,
			orgId: organisation.orgId,
		});

		const token = generateToken(user.userId);
		successHandler(res, "success", "Registration successful", 201, {
			accessToken: token,
			user: {
				userId: user.userId,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
			},
		});
	} catch (error) {
		console.log(error?.message, "error");
		errorHandler(res, "Bad request", "Registration unsuccessful", 400);
	}
};

const login = async (req, res) => {
	const { email, password } = req.body;
	const requiredFields = ["email", "password"];
	const errors = [];

	requiredFields.forEach((field) => {
		if (!req.body[field]) {
			errors.push({
				field,
				message: `${field} is required`,
			});
		}
	});
	if (errors.length > 0) {
		return res.status(422).json({ errors });
	}

	try {
		const user = await User.findOne({ where: { email } });
		if (!user || !(await comparePassword(password, user.password))) {
			return errorHandler(
				res,
				"Bad request",
				"Authentication failed",
				401
			);
		}

		const token = generateToken(user.userId);
		successHandler(res, "success", "Login successful", 200, {
			accessToken: token,
			user: {
				userId: user.userId,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
			},
		});
	} catch (error) {
		errorHandler(res, "Bad request", "Login unsuccessful", 400);
	}
};

module.exports = { register, login };
