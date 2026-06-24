import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});
	});

	describe("POST /api/tasks (validation)", () => {
		it("should return 400 when the title is missing", async () => {
			const res = await request(app).post("/api/tasks").send({});

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
		});
	});

	describe("GET /api/tasks", () => {
		it("should return an empty array when there is no task", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return all created tasks", async () => {
			await testPrisma.task.create({ data: { title: "T1" } });
			await testPrisma.task.create({ data: { title: "T2" } });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return the task when it exists", async () => {
			const created = await testPrisma.task.create({
				data: { title: "Find me" },
			});

			const res = await request(app).get(`/api/tasks/${created.id}`);

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("Find me");
		});

		it("should return 404 when the task does not exist", async () => {
			const res = await request(app).get("/api/tasks/99999");

			expect(res.status).toBe(404);
		});

		it("should return 400 when the id is not a number", async () => {
			const res = await request(app).get("/api/tasks/abc");

			expect(res.status).toBe(400);
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update an existing task", async () => {
			const created = await testPrisma.task.create({
				data: { title: "Before" },
			});

			const res = await request(app)
				.put(`/api/tasks/${created.id}`)
				.send({ title: "After", completed: true });

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("After");
			expect(res.body.completed).toBe(true);
		});

		it("should return 404 when updating a non-existent task", async () => {
			const res = await request(app)
				.put("/api/tasks/99999")
				.send({ title: "Nope" });

			expect(res.status).toBe(404);
		});

		it("should return 400 when the id is invalid", async () => {
			const res = await request(app).put("/api/tasks/abc").send({ title: "X" });

			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete an existing task", async () => {
			const created = await testPrisma.task.create({
				data: { title: "To delete" },
			});

			const res = await request(app).delete(`/api/tasks/${created.id}`);

			expect(res.status).toBe(204);

			const check = await testPrisma.task.findUnique({
				where: { id: created.id },
			});
			expect(check).toBeNull();
		});

		it("should return 404 when deleting a non-existent task", async () => {
			const res = await request(app).delete("/api/tasks/99999");

			expect(res.status).toBe(404);
		});
	});
});
