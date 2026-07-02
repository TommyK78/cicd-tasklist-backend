import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task } from "@prisma/client";

// On mock le module prisma AVANT d'importer le service, afin de tester
// la logique métier du service de façon isolée (test unitaire pur, sans base de données).
vi.mock("../../lib/prisma.js", () => {
	return {
		default: {
			task: {
				findMany: vi.fn(),
				findUnique: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		},
	};
});

import prisma from "../../lib/prisma.js";
import * as taskService from "../../services/task.service.js";

const mockPrisma = vi.mocked(prisma);

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "A test task description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("TaskService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("findAll", () => {
		it("retourne toutes les tâches triées par createdAt décroissant", async () => {
			const tasks = [mockTask];
			(mockPrisma.task.findMany as any).mockResolvedValue(tasks);

			const result = await taskService.findAll();

			expect(result).toEqual(tasks);
			expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
				orderBy: { createdAt: "desc" },
			});
		});

		it("retourne un tableau vide quand il n'y a aucune tâche", async () => {
			(mockPrisma.task.findMany as any).mockResolvedValue([]);

			const result = await taskService.findAll();

			expect(result).toEqual([]);
		});
	});

	describe("findById", () => {
		it("retourne la tâche correspondant à l'identifiant", async () => {
			(mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);

			const result = await taskService.findById(1);

			expect(result).toEqual(mockTask);
			expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
				where: { id: 1 },
			});
		});

		it("retourne null quand la tâche n'existe pas", async () => {
			(mockPrisma.task.findUnique as any).mockResolvedValue(null);

			const result = await taskService.findById(999);

			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("crée une tâche avec un titre et une description", async () => {
			(mockPrisma.task.create as any).mockResolvedValue(mockTask);

			const result = await taskService.create({
				title: "Test Task",
				description: "A test task description",
			});

			expect(result).toEqual(mockTask);
			expect(mockPrisma.task.create).toHaveBeenCalledWith({
				data: {
					title: "Test Task",
					description: "A test task description",
				},
			});
		});

		it("crée une tâche sans description (undefined)", async () => {
			const taskSansDesc = { ...mockTask, description: null };
			(mockPrisma.task.create as any).mockResolvedValue(taskSansDesc);

			const result = await taskService.create({ title: "Sans description" });

			expect(result).toEqual(taskSansDesc);
			expect(mockPrisma.task.create).toHaveBeenCalledWith({
				data: {
					title: "Sans description",
					description: undefined,
				},
			});
		});
	});

	describe("update", () => {
		it("met à jour une tâche existante", async () => {
			const updated = { ...mockTask, completed: true };
			(mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
			(mockPrisma.task.update as any).mockResolvedValue(updated);

			const result = await taskService.update(1, { completed: true });

			expect(result).toEqual(updated);
			expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
			expect(mockPrisma.task.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { completed: true },
			});
		});

		it("lève une erreur 'Task not found' si la tâche n'existe pas", async () => {
			(mockPrisma.task.findUnique as any).mockResolvedValue(null);

			await expect(taskService.update(999, { title: "X" })).rejects.toThrow(
				"Task not found"
			);
			expect(mockPrisma.task.update).not.toHaveBeenCalled();
		});
	});

	describe("remove", () => {
		it("supprime une tâche existante", async () => {
			(mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
			(mockPrisma.task.delete as any).mockResolvedValue(mockTask);

			const result = await taskService.remove(1);

			expect(result).toEqual(mockTask);
			expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 1 } });
		});

		it("lève une erreur 'Task not found' si la tâche n'existe pas", async () => {
			(mockPrisma.task.findUnique as any).mockResolvedValue(null);

			await expect(taskService.remove(999)).rejects.toThrow("Task not found");
			expect(mockPrisma.task.delete).not.toHaveBeenCalled();
		});
	});
});
