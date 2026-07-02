import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// On mock la couche service afin de tester le controller de façon isolée :
// on vérifie les codes HTTP et le corps des réponses, sans dépendre de la base.
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
		it("retourne 200 avec toutes les tâches", async () => {
			const tasks = [mockTask];
			mockService.findAll.mockResolvedValue(tasks);
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(tasks);
		});

		it("retourne 500 quand le service échoue", async () => {
			mockService.findAll.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
		});
	});

	describe("getTaskById", () => {
		it("retourne 200 avec la tâche demandée", async () => {
			mockService.findById.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("retourne 400 si l'identifiant n'est pas un nombre", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
			expect(mockService.findById).not.toHaveBeenCalled();
		});

		it("retourne 404 si la tâche n'existe pas", async () => {
			mockService.findById.mockResolvedValue(null);
			const req = createMockRequest({ params: { id: "999" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("retourne 500 quand le service échoue", async () => {
			mockService.findById.mockRejectedValue(new Error("boom"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
		});
	});

	describe("createTask", () => {
		it("retourne 201 avec la tâche créée", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "Test Task", description: "Test description" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Test Task",
				description: "Test description",
			});
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("nettoie le titre (trim) avant création", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({ body: { title: "  Test Task  " } });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Test Task",
				description: undefined,
			});
		});

		it("retourne 400 si le titre est absent", async () => {
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.create).not.toHaveBeenCalled();
		});

		it("retourne 400 si le titre est une chaîne vide", async () => {
			const req = createMockRequest({ body: { title: "   " } });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.create).not.toHaveBeenCalled();
		});

		it("retourne 500 quand le service échoue", async () => {
			mockService.create.mockRejectedValue(new Error("boom"));
			const req = createMockRequest({ body: { title: "Test" } });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
		});
	});

	describe("updateTask", () => {
		it("retourne 200 avec la tâche mise à jour", async () => {
			const updated = { ...mockTask, completed: true };
			mockService.update.mockResolvedValue(updated);
			const req = createMockRequest({
				params: { id: "1" },
				body: { completed: true },
			});
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(mockService.update).toHaveBeenCalledWith(1, {
				title: undefined,
				description: undefined,
				completed: true,
			});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updated);
		});

		it("retourne 400 si l'identifiant est invalide", async () => {
			const req = createMockRequest({ params: { id: "abc" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.update).not.toHaveBeenCalled();
		});

		it("retourne 404 si la tâche n'existe pas", async () => {
			mockService.update.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "999" }, body: { title: "X" } });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("retourne 500 pour toute autre erreur", async () => {
			mockService.update.mockRejectedValue(new Error("boom"));
			const req = createMockRequest({ params: { id: "1" }, body: { title: "X" } });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
		});
	});

	describe("deleteTask", () => {
		it("retourne 204 quand la suppression réussit", async () => {
			mockService.remove.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(mockService.remove).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
		});

		it("retourne 400 si l'identifiant est invalide", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.remove).not.toHaveBeenCalled();
		});

		it("retourne 404 si la tâche n'existe pas", async () => {
			mockService.remove.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "999" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("retourne 500 pour toute autre erreur", async () => {
			mockService.remove.mockRejectedValue(new Error("boom"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
		});
	});
});
