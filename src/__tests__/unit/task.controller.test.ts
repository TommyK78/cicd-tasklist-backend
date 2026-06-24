import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock the service module
vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	} as unknown as Response;
	return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
	return {
		params: {},
		body: {},
		query: {},
		...overrides,
	} as unknown as Request;
}

describe("TaskController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllTasks", () => {
		it("should return 200 with all tasks", async () => {
			const tasks = [mockTask];
			mockService.findAll.mockResolvedValue(tasks);
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(tasks);
		});
	});

	describe("getTaskById", () => {
		it("should return 400 when the id is not a number", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});

		it("should return 404 when the task is not found", async () => {
			mockService.findById.mockResolvedValue(null);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
		});

		it("should return 200 with the task when found", async () => {
			mockService.findById.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});
	});

	describe("createTask", () => {
		it("should return 400 when the title is missing", async () => {
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});

		it("should return 201 and create the task", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "New Task", description: "Desc" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});
	});

	describe("updateTask", () => {
		it("should return 400 when the id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});

		it("should return 200 when the task is updated", async () => {
			const updated = { ...mockTask, completed: true };
			mockService.update.mockResolvedValue(updated);
			const req = createMockRequest({
				params: { id: "1" },
				body: { completed: true },
			});
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
		});

		it("should return 404 when the task does not exist", async () => {
			mockService.update.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "1" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
		});
	});

	describe("deleteTask", () => {
		it("should return 400 when the id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});

		it("should return 204 when the task is deleted", async () => {
			mockService.remove.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(204);
		});

		it("should return 404 when the task does not exist", async () => {
			mockService.remove.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
		});
	});

	// Couverture des branches catch (erreur serveur 500)
	describe("error handling", () => {
		it("getAllTasks returns 500 on failure", async () => {
			mockService.findAll.mockRejectedValue(new Error("DB down"));
			const res = createMockResponse();
			await taskController.getAllTasks(createMockRequest(), res);
			expect(res.status).toHaveBeenCalledWith(500);
		});

		it("getTaskById returns 500 on failure", async () => {
			mockService.findById.mockRejectedValue(new Error("DB down"));
			const res = createMockResponse();
			await taskController.getTaskById(createMockRequest({ params: { id: "1" } }), res);
			expect(res.status).toHaveBeenCalledWith(500);
		});

		it("createTask returns 500 on failure", async () => {
			mockService.create.mockRejectedValue(new Error("DB down"));
			const res = createMockResponse();
			await taskController.createTask(createMockRequest({ body: { title: "X" } }), res);
			expect(res.status).toHaveBeenCalledWith(500);
		});

		it("updateTask returns 500 on failure", async () => {
			mockService.update.mockRejectedValue(new Error("DB down"));
			const res = createMockResponse();
			await taskController.updateTask(createMockRequest({ params: { id: "1" }, body: {} }), res);
			expect(res.status).toHaveBeenCalledWith(500);
		});

		it("deleteTask returns 500 on failure", async () => {
			mockService.remove.mockRejectedValue(new Error("DB down"));
			const res = createMockResponse();
			await taskController.deleteTask(createMockRequest({ params: { id: "1" } }), res);
			expect(res.status).toHaveBeenCalledWith(500);
		});
	});
});
