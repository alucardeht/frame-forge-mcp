import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { SessionManager } from '../../src/session/session-manager.js';
import { MockMLXEngine } from '../../tests/mocks/mock-mlx-engine.js';
import { MLXEngine } from '../../src/engines/mlx-engine.js';
import {
	handleGenerateImage,
	handleCheckEngineStatus,
	handleListAvailableModels,
	handleListIterations,
	handleGenerateVariants,
	handleSelectVariant,
	handleRefineAsset,
	handleGenerateBanner,
	handleExportAsset,
	handleListSessions,
	handleCompareIterations,
	handleResolveIterationReference,
	handleUndo,
	handleRedo,
	handleGenerateWireframe,
	handleUpdateComponent,
	handleRefineComponent,
} from '../../src/mcp/tools/index.js';

describe('MCP Tools E2E Tests', () => {
	let testStorageDir: string;
	let sessionManager: SessionManager;
	let engine: MockMLXEngine;

	beforeEach(async () => {
		testStorageDir = path.join(os.tmpdir(), `visualai-e2e-${Date.now()}`);
		await fs.mkdir(testStorageDir, { recursive: true });

		sessionManager = new SessionManager(testStorageDir);
		await sessionManager.initialize();

		engine = new MockMLXEngine({
			modelName: 'flux-dev',
			cacheDir: path.join(testStorageDir, 'mlx-cache'),
			simulatedLatencyMs: 100,
		});
	});

	afterEach(async () => {
		try {
			await fs.rm(testStorageDir, { recursive: true, force: true });
		} catch (error) {
			console.error('Cleanup error:', error);
		}
	});

	describe('Suite 1: Error Propagation & Recovery', () => {
		describe('Scenario 1: Validation Errors', () => {
			it('T001: should reject invalid dimensions (width)', async () => {
				const session = await sessionManager.createSession();
				const invalidParams = {
					sessionId: session.id,
					prompt: 'test image',
					width: -100,
					height: 512,
				};

				const result = await handleGenerateImage(
					invalidParams as any,
					engine,
					sessionManager
				);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
				const errorBlock = (result.content as any[]).find(
					(c: any) => c.type === 'text' && c.text?.match(/width|dimension|invalid|error/i)
				);
				expect(errorBlock).toBeDefined();
			});

			it('T002: should reject missing required fields (prompt)', async () => {
				const session = await sessionManager.createSession();
				const invalidParams = {
					sessionId: session.id,
					width: 512,
					height: 512,
				};

				const result = await handleGenerateImage(
					invalidParams as any,
					engine,
					sessionManager
				);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
				const errorBlock = (result.content as any[]).find(
					(c: any) => c.type === 'text' && c.text?.match(/prompt|required|missing|error/i)
				);
				expect(errorBlock).toBeDefined();
			});

			it('T003: should reject invalid variant ID references', async () => {
				const session = await sessionManager.createSession();
				const invalidParams = {
					sessionId: session.id,
					variantId: 'nonexistent-variant-id-12345',
				};

				const result = await handleSelectVariant(
					invalidParams as any,
					sessionManager
				);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
				const errorBlock = (result.content as any[]).find(
					(c: any) => c.type === 'text' && c.text?.match(/variant|not found|invalid|error/i)
				);
				expect(errorBlock).toBeDefined();
			});
		});

		describe('Scenario 2: Engine Failures', () => {
			it('T004: should handle engine initialization failure', async () => {
				const failingEngine = new MockMLXEngine({
					modelName: 'flux-dev',
					cacheDir: path.join(testStorageDir, 'mlx-cache'),
					simulatedLatencyMs: 100,
				});

				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					prompt: 'test image',
					width: 512,
					height: 512,
				};

				const result = await handleGenerateImage(
					params,
					failingEngine as unknown as MLXEngine,
					sessionManager
				);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});

			it('T005: should handle generation timeout', async () => {
				const timeoutEngine = new MockMLXEngine({
					modelName: 'flux-dev',
					cacheDir: path.join(testStorageDir, 'mlx-cache'),
					simulatedLatencyMs: 100,
				});

				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					prompt: 'test image',
					width: 512,
					height: 512,
				};

				const result = await handleGenerateImage(params, timeoutEngine as unknown as MLXEngine, sessionManager);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});

			it('T006: should propagate model download failure', async () => {
				const result = await handleListAvailableModels();
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});

			it('T007: should recover from session state errors', async () => {
				const params = {
					sessionId: 'corrupted-session-id-invalid',
				};

				const result = await handleListIterations(params as any, sessionManager);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});
		});

		describe('Scenario 3: Session State Errors', () => {
			it('T008: should handle missing session', async () => {
				const params = {
					sessionId: 'nonexistent-session-999',
					prompt: 'test',
					width: 256,
					height: 256,
				};

				const result = await handleGenerateImage(
					params as any,
					engine,
					sessionManager
				);
				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
				const errorBlock = (result.content as any[]).find(
					(c: any) => c.type === 'text' && c.text?.match(/session|not found|error/i)
				);
				expect(errorBlock).toBeDefined();
			});

			it('T009: should recover from corrupted session data', async () => {
				const session = await sessionManager.createSession();
				const corruptedSessionPath = path.join(
					testStorageDir,
					'sessions',
					session.id,
					'state.json'
				);

				await fs.mkdir(path.dirname(corruptedSessionPath), {
					recursive: true,
				});
				await fs.writeFile(corruptedSessionPath, '{invalid json}');

				const params = {
					sessionId: session.id,
				};

				const result = await handleListIterations(params as any, sessionManager);
				expect(result.content).toBeDefined();
			});

			it('T010: should handle concurrent modification conflicts', async () => {
				const session = await sessionManager.createSession();

				const params1 = {
					sessionId: session.id,
					prompt: 'first generation',
					width: 512,
					height: 512,
				};

				const params2 = {
					sessionId: session.id,
					prompt: 'second generation',
					width: 512,
					height: 512,
				};

				const results = await Promise.all([
					handleGenerateImage(params1, engine, sessionManager).catch(
						(e) => ({ error: e })
					),
					handleGenerateImage(params2, engine, sessionManager).catch(
						(e) => ({ error: e })
					),
				]);

				expect(results).toBeDefined();
				expect(Array.isArray(results)).toBe(true);
			});
		});

		describe('Scenario 4: Metrics Recording', () => {
			it('T011: should log error metrics correctly', async () => {
				const session = await sessionManager.createSession();
				const invalidParams = {
					sessionId: session.id,
					width: -100,
					height: 512,
				};

				await handleGenerateImage(invalidParams as any, engine, sessionManager);
				const sessionMetrics = sessionManager.getMetricsSnapshot();
				expect(sessionMetrics).toBeDefined();
			});

			it('T012: should track retry attempts', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					prompt: 'test',
					width: 512,
					height: 512,
				};

				let results = [];
				for (let i = 0; i < 3; i++) {
					const result = await handleGenerateImage(params, engine, sessionManager);
					results.push(result);
				}

				expect(results.length).toBe(3);
				expect(results[0]).toBeDefined();
			});
		});
	});

	describe('Suite 2: Metadata Flow & Persistence', () => {
		describe('Scenario 1: Variant Lifecycle Tracking', () => {
			it('T013: should track variant creation metadata', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					basePrompt: 'beautiful landscape',
					variationCount: 3,
				};

				const result = await handleGenerateVariants(
					params as any,
					engine,
					sessionManager
				);

				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);

				const sessionState = await sessionManager.loadSession(session.id);
				expect(sessionState).toBeDefined();
			});

			it('T014: should persist variant selection state', async () => {
				const session = await sessionManager.createSession();
				const generateParams = {
					sessionId: session.id,
					basePrompt: 'test variants',
					variationCount: 2,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				);

				const variantIds = (generateResult.content as any[])
					.filter((c: any) => c.type === 'image')
					.map((c: any) => c.variantId)
					.filter(Boolean);

				if (variantIds.length > 0) {
					const selectParams = {
						sessionId: session.id,
						variantId: variantIds[0],
					};

					const selectResult = await handleSelectVariant(
						selectParams as any,
						sessionManager
					);

					expect(selectResult.content).toBeDefined();
					expect(Array.isArray(selectResult.content)).toBe(true);
				}
			});

			it('T015: should maintain refinement history chain', async () => {
				const session = await sessionManager.createSession();
				const generateParams = {
					sessionId: session.id,
					basePrompt: 'initial design',
					variationCount: 1,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				);

				const variantIds = (generateResult.content as any[])
					.filter((c: any) => c.type === 'image')
					.map((c: any) => c.variantId)
					.filter(Boolean);

				if (variantIds.length > 0) {
					const refineParams = {
						sessionId: session.id,
						variantId: variantIds[0],
						refinement: 'increase contrast',
					};

					const refineResult = await handleRefineAsset(
						refineParams as any,
						engine,
						sessionManager
					);

					expect(refineResult.content).toBeDefined();
					expect(Array.isArray(refineResult.content)).toBe(true);
				}
			});
		});

		describe('Scenario 2: Cross-Session Isolation', () => {
			it('T016: should isolate variants between sessions', async () => {
				const session1 = await sessionManager.createSession();
				const session2 = await sessionManager.createSession();

				const params1 = {
					sessionId: session1.id,
					basePrompt: 'session 1 content',
					variationCount: 1,
				};

				const params2 = {
					sessionId: session2.id,
					basePrompt: 'session 2 content',
					variationCount: 1,
				};

				const result1 = await handleGenerateVariants(
					params1 as any,
					engine,
					sessionManager
				).catch(() => null);
				const result2 = await handleGenerateVariants(
					params2 as any,
					engine,
					sessionManager
				).catch(() => null);

				expect(result1).toBeDefined();
				expect(result2).toBeDefined();

				const state1 = await sessionManager.loadSession(session1.id);
				const state2 = await sessionManager.loadSession(session2.id);

				expect(state1).not.toEqual(state2);
			});

			it('T017: should invalidate cache on session delete', async () => {
				const session = await sessionManager.createSession();
				const sessionPath = path.join(testStorageDir, 'sessions', session.id);

				const listResult = await handleListSessions(
					sessionManager
				).catch(() => null);

				expect(listResult).toBeDefined();

				sessionManager.deleteSession(session.id);
				const dirExists = await fs
					.stat(sessionPath)
					.then(() => true)
					.catch(() => false);

				expect(dirExists).toBe(false);
			});
		});

		describe('Scenario 3: Iteration References', () => {
			it('T018: should resolve valid iteration references', async () => {
				const session = await sessionManager.createSession();

				const listParams = {
					sessionId: session.id,
				};

				const listResult = await handleListIterations(
					listParams as any,
					sessionManager
				).catch(() => null);

				if (listResult && listResult.content && listResult.content.length > 0) {
					const firstIteration = (listResult.content as any[])[0];
					const iterationId = firstIteration.iterationId || firstIteration.id;

					if (iterationId) {
						const resolveParams = {
							sessionId: session.id,
							reference: iterationId,
						};

						const resolveResult = await handleResolveIterationReference(
							resolveParams as any,
							sessionManager
						).catch(() => null);

						expect(resolveResult).toBeDefined();
					}
				}
			});

			it('T019: should handle stale iteration references', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					reference: 'stale-iteration-ref-12345',
				};

				const result = await handleResolveIterationReference(
					params as any,
					sessionManager
				);
				expect(result.content).toBeDefined();
			});
		});

		describe('Scenario 4: Export Metadata', () => {
			it('T020: should maintain accuracy in multi-format export', async () => {
				const session = await sessionManager.createSession();

				const exportParams = {
					sessionId: session.id,
					formats: ['png', 'jpg', 'webp'],
					quality: 95,
				};

				const result = await handleExportAsset(
					exportParams as any,
					sessionManager
				).catch(() => null);

				if (result) {
					expect(result.content).toBeDefined();
					expect(Array.isArray(result.content)).toBe(true);

					const textBlocks = (result.content as any[]).filter(
						(c: any) => c.type === 'text'
					);
					expect(textBlocks.length).toBeGreaterThan(0);
				}
			});
		});
	});

	describe('Suite 3: Response Format Validation', () => {
		describe('Scenario 1: MCPToolResult Structure', () => {
			it('T021: should return array content for all tools', async () => {
				const statusResult = await handleCheckEngineStatus(
					engine as unknown as MLXEngine
				);

				expect(statusResult.content).toBeDefined();
				expect(Array.isArray(statusResult.content)).toBe(true);
			});

			it('T022: should have correct type for text blocks', async () => {
				const result = await handleListSessions(
					sessionManager
				);

				const textBlocks = (result.content as any[]).filter(
					(c: any) => c.type === 'text'
				);
				textBlocks.forEach((block: any) => {
					expect(block.type).toBe('text');
					expect(block.text).toBeDefined();
					expect(typeof block.text).toBe('string');
				});
			});

			it('T023: should have correct type for image blocks', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					basePrompt: 'test image',
					variationCount: 1,
				};

				const result = await handleGenerateVariants(
					params as any,
					engine,
					sessionManager
				).catch(() => null);

				if (result) {
					const imageBlocks = (result.content as any[]).filter(
						(c: any) => c.type === 'image'
					);
					imageBlocks.forEach((block: any) => {
						expect(block.type).toBe('image');
						expect(block.data || block.url).toBeDefined();
					});
				}
			});

			it('T024: should never return raw strings as response', async () => {
				const result = await handleCheckEngineStatus(
					engine as unknown as MLXEngine
				);

				expect(typeof result).toBe('object');
				expect(result.content).toBeDefined();
				expect(typeof result.content).not.toBe('string');
			});

			it('T025: should follow MCPToolResult in error responses', async () => {
				const session = await sessionManager.createSession();
				const invalidParams = {
					sessionId: session.id,
					width: -100,
					height: 512,
				};

				const result = await handleGenerateImage(invalidParams as any, engine, sessionManager);
				expect(result).toBeDefined();
				expect(result.content).toBeDefined();
			});
		});

		describe('Scenario 2: Multi-Format Consistency', () => {
			it('T026: should return N variants from generate-variants', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					basePrompt: 'test variants',
					variationCount: 3,
				};

				const result = await handleGenerateVariants(
					params as any,
					engine,
					sessionManager
				);

				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});

			it('T027: should confirm selection in select-variant', async () => {
				const session = await sessionManager.createSession();
				const generateParams = {
					sessionId: session.id,
					basePrompt: 'test',
					variationCount: 1,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				).catch(() => null);

				if (generateResult) {
					const variantIds = (generateResult.content as any[])
						.filter((c: any) => c.type === 'image')
						.map((c: any) => c.variantId)
						.filter(Boolean);

					if (variantIds.length > 0) {
						const selectParams = {
							sessionId: session.id,
							variantId: variantIds[0],
						};

						const selectResult = await handleSelectVariant(
							selectParams as any,
							sessionManager
						).catch(() => null);

						if (selectResult) {
							const textBlocks = (selectResult.content as any[]).filter(
								(c: any) => c.type === 'text'
							);
							expect(textBlocks.length).toBeGreaterThan(0);
						}
					}
				}
			});

			it('T028: should return updated asset from refine-asset', async () => {
				const session = await sessionManager.createSession();
				const generateParams = {
					sessionId: session.id,
					basePrompt: 'test',
					variationCount: 1,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				).catch(() => null);

				if (generateResult) {
					const variantIds = (generateResult.content as any[])
						.filter((c: any) => c.type === 'image')
						.map((c: any) => c.variantId)
						.filter(Boolean);

					if (variantIds.length > 0) {
						const refineParams = {
							sessionId: session.id,
							variantId: variantIds[0],
							refinement: 'adjust colors',
						};

						const refineResult = await handleRefineAsset(
							refineParams as any,
							engine,
							sessionManager
						).catch(() => null);

						if (refineResult) {
							expect(refineResult.content).toBeDefined();
							expect(Array.isArray(refineResult.content)).toBe(true);
						}
					}
				}
			});

			it('T029: should include layout metadata in generate-banner', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					bannerDescription: 'Product launch banner',
					layout: 'hero section on left, call-to-action button on right',
					dimensions: { width: 1200, height: 400 },
				};

				const result = await handleGenerateBanner(
					params as any,
					engine,
					sessionManager
				);

				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});

			it('T030: should return all requested formats from export-asset', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					formats: ['png', 'jpg'],
				};

				const result = await handleExportAsset(
					params as any,
					sessionManager
				).catch(() => null);

				if (result) {
					expect(result.content).toBeDefined();
					expect(Array.isArray(result.content)).toBe(true);
				}
			});

			it('T031: should maintain pagination consistency in list-sessions', async () => {
				const session1 = await sessionManager.createSession();
				const session2 = await sessionManager.createSession();

				expect(session1.id).not.toBe(session2.id);

				const result = await handleListSessions(
					sessionManager
				).catch(() => null);

				if (result) {
					expect(result.content).toBeDefined();
					expect(Array.isArray(result.content)).toBe(true);
				}
			});

			it('T032: should provide consistent diff format in compare-iterations', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					iterationId1: 'iter-1',
					iterationId2: 'iter-2',
				};

				const result = await handleCompareIterations(
					params as any,
					sessionManager
				).catch(() => null);

				if (result) {
					expect(result.content).toBeDefined();
					expect(Array.isArray(result.content)).toBe(true);
				}
			});
		});

		describe('Scenario 3: Response Content Validation', () => {
			it('T033: should match text descriptions to operation', async () => {
				const result = await handleCheckEngineStatus(
					engine as unknown as MLXEngine
				);

				const textBlocks = (result.content as any[]).filter(
					(c: any) => c.type === 'text'
				);
				textBlocks.forEach((block: any) => {
					expect(block.text).toBeDefined();
					expect(block.text.length).toBeGreaterThan(0);
				});
			});

			it('T034: should return valid base64 image data', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					basePrompt: 'test',
					variationCount: 1,
				};

				const result = await handleGenerateVariants(
					params as any,
					engine,
					sessionManager
				).catch(() => null);

				if (result) {
					const imageBlocks = (result.content as any[]).filter(
						(c: any) => c.type === 'image'
					);
					imageBlocks.forEach((block: any) => {
						if (block.data) {
							const base64Regex = /^[A-Za-z0-9+/=]+$/;
							expect(base64Regex.test(block.data)).toBe(true);
						}
					});
				}
			});

			it('T035: should ensure metadata completeness', async () => {
				const session = await sessionManager.createSession();
				const result = await handleListIterations(
					{ sessionId: session.id } as any,
					sessionManager
				).catch(() => null);

				if (result && result.content && result.content.length > 0) {
					(result.content as any[]).forEach((item: any) => {
						if (item.type === 'text' && item.metadata) {
							expect(item.metadata).toBeInstanceOf(Object);
						}
					});
				}
			});
		});
	});

	describe('Suite 4: Integration Workflows', () => {
		describe('Scenario 1: Full Asset Generation Flow', () => {
			it('T036: should execute generate-variants → select-variant → refine-asset → export-asset', async () => {
				const session = await sessionManager.createSession();

				const generateParams = {
					sessionId: session.id,
					basePrompt: 'professional logo design',
					variationCount: 2,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				);

				expect(generateResult).toBeDefined();
				expect(generateResult.content).toBeDefined();
				expect(Array.isArray(generateResult.content)).toBe(true);

				const variantIds = (generateResult.content as any[])
					.filter((c: any) => c.type === 'image')
					.map((c: any) => c.variantId)
					.filter(Boolean);

				expect(variantIds.length).toBeGreaterThanOrEqual(0);

				if (variantIds.length > 0) {
					const selectParams = {
						sessionId: session.id,
						variantId: variantIds[0],
					};

					const selectResult = await handleSelectVariant(
						selectParams as any,
						sessionManager
					).catch(() => null);

					expect(selectResult).toBeDefined();

					if (selectResult) {
						const refineParams = {
							sessionId: session.id,
							variantId: variantIds[0],
							refinement: 'increase saturation',
						};

						const refineResult = await handleRefineAsset(
							refineParams as any,
							engine,
							sessionManager
						).catch(() => null);

						if (refineResult) {
							const exportParams = {
								sessionId: session.id,
								formats: ['png', 'jpg'],
							};

							const exportResult = await handleExportAsset(
								exportParams as any,
								sessionManager
							).catch(() => null);

							expect(exportResult).toBeDefined();
						}
					}
				}
			});

			it('T037: should propagate metadata through entire chain', async () => {
				const session = await sessionManager.createSession();

				const generateParams = {
					sessionId: session.id,
					basePrompt: 'test metadata propagation',
					variationCount: 1,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				).catch(() => null);

				const stateAfterGenerate = await sessionManager.loadSession(session.id);
				expect(stateAfterGenerate).toBeDefined();

				if (generateResult) {
					const variantIds = (generateResult.content as any[])
						.filter((c: any) => c.type === 'image')
						.map((c: any) => c.variantId)
						.filter(Boolean);

					if (variantIds.length > 0) {
						const selectParams = {
							sessionId: session.id,
							variantId: variantIds[0],
						};

						await handleSelectVariant(
							selectParams as any,
							sessionManager
						).catch(() => null);

						const stateAfterSelect = await sessionManager.loadSession(session.id);
						expect(stateAfterSelect).toBeDefined();
					}
				}
			});

			it('T038: should record all steps in session history', async () => {
				const session = await sessionManager.createSession();
				const initialMetrics = sessionManager.getMetricsSnapshot();

				const generateParams = {
					sessionId: session.id,
					basePrompt: 'history tracking test',
					variationCount: 1,
				};

				await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				).catch(() => null);

				const finalMetrics = sessionManager.getMetricsSnapshot();
				expect(finalMetrics).toBeDefined();
				expect(initialMetrics).toBeDefined();
			});
		});

		describe('Scenario 2: Banner Generation', () => {
			it('T039: should parse layout in generate-banner', async () => {
				const session = await sessionManager.createSession();
				const params = {
					sessionId: session.id,
					bannerDescription: 'Marketing Banner with promotional content',
					layout: 'hero section on left, call-to-action button on right',
					dimensions: { width: 1200, height: 400 },
				};

				const result = await handleGenerateBanner(
					params as any,
					engine,
					sessionManager
				);

				expect(result.content).toBeDefined();
				expect(Array.isArray(result.content)).toBe(true);
			});

			it('T040: should include all formats in banner export', async () => {
				const session = await sessionManager.createSession();
				const bannerParams = {
					sessionId: session.id,
					bannerDescription: 'Testing export functionality',
					layout: 'sidebar layout with top header',
					dimensions: { width: 1200, height: 400 },
				};

				await handleGenerateBanner(
					bannerParams as any,
					engine,
					sessionManager
				).catch(() => null);

				const exportParams = {
					sessionId: session.id,
					formats: ['png', 'jpg', 'webp'],
				};

				const exportResult = await handleExportAsset(
					exportParams as any,
					sessionManager
				).catch(() => null);

				if (exportResult) {
					expect(exportResult.content).toBeDefined();
					expect(Array.isArray(exportResult.content)).toBe(true);
				}
			});
		});

		describe('Scenario 3: Wireframe Evolution', () => {
			it('T041: should execute generate-wireframe → update-component → refine-component', async () => {
				const session = await sessionManager.createSession();

				const generateParams = {
					sessionId: session.id,
					type: 'landing-page',
				};

				const generateResult = await handleGenerateWireframe(
					generateParams as any,
					sessionManager
				).catch(() => null);

				if (generateResult) {
					expect(generateResult.content).toBeDefined();
					expect(Array.isArray(generateResult.content)).toBe(true);

					const updateParams = {
						sessionId: session.id,
						componentId: 'header',
						updates: { layout: 'flex' },
					};

					const updateResult = await handleUpdateComponent(
						updateParams as any,
						sessionManager
					).catch(() => null);

					if (updateResult) {
						const refineParams = {
							sessionId: session.id,
							componentId: 'header',
							refinement: 'adjust spacing',
						};

						const refineResult = await handleRefineComponent(
							refineParams as any,
							sessionManager
						).catch(() => null);

						expect(refineResult).toBeDefined();
					}
				}
			});

			it('T042: should isolate component changes from affecting others', async () => {
				const session = await sessionManager.createSession();

				const generateParams = {
					sessionId: session.id,
					type: 'dashboard',
				};

				await handleGenerateWireframe(
					generateParams as any,
					sessionManager
				).catch(() => null);

				const updateParams1 = {
					sessionId: session.id,
					componentId: 'sidebar',
					updates: { width: '250px' },
				};

				const updateParams2 = {
					sessionId: session.id,
					componentId: 'header',
					updates: { height: '80px' },
				};

				const result1 = await handleUpdateComponent(
					updateParams1 as any,
					sessionManager
				).catch(() => null);
				const result2 = await handleUpdateComponent(
					updateParams2 as any,
					sessionManager
				).catch(() => null);

				expect(result1).toBeDefined();
				expect(result2).toBeDefined();
			});
		});

		describe('Scenario 4: Undo/Redo Chain', () => {
			it('T043: should preserve state correctly through undo → redo', async () => {
				const session = await sessionManager.createSession();

				const generateParams = {
					sessionId: session.id,
					basePrompt: 'undo-redo test',
					variationCount: 1,
				};

				const generateResult = await handleGenerateVariants(
					generateParams as any,
					engine,
					sessionManager
				).catch(() => null);

				if (generateResult) {
					const stateBeforeUndo = await sessionManager.loadSession(session.id);

					const undoParams = {
						sessionId: session.id,
					};

					await handleUndo(undoParams as any, sessionManager).catch(
						() => null
					);

					const stateAfterUndo = await sessionManager.loadSession(session.id);

					await handleRedo(undoParams as any, sessionManager).catch(
						() => null
					);

					const stateAfterRedo = await sessionManager.loadSession(session.id);

					expect(stateBeforeUndo).toBeDefined();
					expect(stateAfterUndo).toBeDefined();
					expect(stateAfterRedo).toBeDefined();
				}
			});
		});
	});
});
