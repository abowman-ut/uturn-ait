<script>
	import { slide, fade } from 'svelte/transition';
	import { generateClient } from 'aws-amplify/data';
	import '$lib/amplify';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const client = generateClient();
	
	let showAdminWindow = $state(false);
	let activeScreen = $state('groupings'); // 'groupings' or 'teammates'

	// Groupings data
	let contracts = $state([]);
	let expenseTypes = $state([]);
	let companies = $state([]);
	let resourceGroups = $state([]);
	let resourceTypes = $state([]);

	// Input values
	let contractInput = $state('');
	let expenseTypeInput = $state('');
	let companyInput = $state('');
	let resourceGroupInput = $state('');
	let resourceTypeInput = $state('');

	// Database record ID
	let groupingsId = $state(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	// Load groupings from database
	async function loadGroupings() {
		if (!browser) return;
		
		// Check if Groupings model exists
		if (!client.models.Groupings) {
			console.warn('Groupings model not found. Schema may need to be deployed.');
			return;
		}
		
		isLoading = true;
		try {
			console.log('Loading groupings from database...');
			const result = await client.models.Groupings.list({ limit: 1 });
			console.log('Load result:', result);
			
			if (result.data && result.data.length > 0) {
				const record = result.data[0];
				console.log('Loaded record:', record);
				groupingsId = record.id;
				contracts = record.contracts || [];
				expenseTypes = record.expenseTypes || [];
				companies = record.companies || [];
				resourceGroups = record.resourceGroups || [];
				resourceTypes = record.resourceTypes || [];
				console.log('Loaded data:', { contracts, expenseTypes, companies, resourceGroups, resourceTypes });
			} else {
				console.log('No groupings record found in database');
			}
		} catch (error) {
			console.error('Error loading groupings:', error);
			// Don't show alert on load errors, just log them
		} finally {
			isLoading = false;
		}
	}

	// Save groupings to database
	async function saveGroupings() {
		if (!browser) return;
		
		// Check if Groupings model exists
		if (!client.models.Groupings) {
			console.error('Groupings model not found. Please deploy your schema changes.');
			alert('Groupings model not available. Please run "npx ampx sandbox" to deploy schema changes.');
			return;
		}
		
		isSaving = true;
		try {
			const data = {
				contracts: contracts || [],
				expenseTypes: expenseTypes || [],
				companies: companies || [],
				resourceGroups: resourceGroups || [],
				resourceTypes: resourceTypes || [],
			};

			console.log('Saving groupings:', data);

			if (groupingsId) {
				// Update existing record
				const result = await client.models.Groupings.update({
					id: groupingsId,
					...data,
				});
				console.log('Update result:', result);
			} else {
				// Create new record
				const result = await client.models.Groupings.create(data);
				console.log('Create result:', result);
				if (result.data) {
					groupingsId = result.data.id;
					console.log('Created with ID:', groupingsId);
				} else {
					console.error('Create failed - no data returned:', result);
				}
			}
		} catch (error) {
			console.error('Error saving groupings:', error);
			alert('Error saving to database: ' + (error.message || error));
		} finally {
			isSaving = false;
		}
	}

	// Load on mount
	onMount(() => {
		loadGroupings();
	});

	function toggleAdminWindow() {
		showAdminWindow = !showAdminWindow;
	}

	function setActiveScreen(screen) {
		activeScreen = screen;
	}

	async function addContract() {
		if (contractInput.trim()) {
			contracts = [...contracts, contractInput.trim()];
			contractInput = '';
			await saveGroupings();
		}
	}

	async function addExpenseType() {
		if (expenseTypeInput.trim()) {
			expenseTypes = [...expenseTypes, expenseTypeInput.trim()];
			expenseTypeInput = '';
			await saveGroupings();
		}
	}

	async function addCompany() {
		if (companyInput.trim()) {
			companies = [...companies, companyInput.trim()];
			companyInput = '';
			await saveGroupings();
		}
	}

	async function addResourceGroup() {
		if (resourceGroupInput.trim()) {
			resourceGroups = [...resourceGroups, resourceGroupInput.trim()];
			resourceGroupInput = '';
			await saveGroupings();
		}
	}

	async function addResourceType() {
		if (resourceTypeInput.trim()) {
			resourceTypes = [...resourceTypes, resourceTypeInput.trim()];
			resourceTypeInput = '';
			await saveGroupings();
		}
	}

	async function removeContract(index) {
		contracts = contracts.filter((_, i) => i !== index);
		await saveGroupings();
	}

	async function removeExpenseType(index) {
		expenseTypes = expenseTypes.filter((_, i) => i !== index);
		await saveGroupings();
	}

	async function removeCompany(index) {
		companies = companies.filter((_, i) => i !== index);
		await saveGroupings();
	}

	async function removeResourceGroup(index) {
		resourceGroups = resourceGroups.filter((_, i) => i !== index);
		await saveGroupings();
	}

	async function removeResourceType(index) {
		resourceTypes = resourceTypes.filter((_, i) => i !== index);
		await saveGroupings();
	}

	// Delete all groupings data
	async function deleteAllGroupings() {
		if (!browser) return;
		
		if (!confirm('Are you sure you want to delete all groupings data? This action cannot be undone.')) {
			return;
		}

		isSaving = true;
		try {
			if (groupingsId) {
				await client.models.Groupings.delete({ id: groupingsId });
			}
			// Clear all local state
			groupingsId = null;
			contracts = [];
			expenseTypes = [];
			companies = [];
			resourceGroups = [];
			resourceTypes = [];
		} catch (error) {
			console.error('Error deleting groupings:', error);
		} finally {
			isSaving = false;
		}
	}
</script>

<style>
	.spin {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>

<div class="container mt-5">
	<div class="row justify-content-center">
		<div class="col-md-8">
			<div class="card">
				<div class="card-header d-flex justify-content-between align-items-center">
					<h1 class="card-title mb-0">
						<i class="bi bi-graph-up text-success me-2"></i>
						Forecast
					</h1>
					<button 
						class="btn btn-outline-secondary btn-sm" 
						onclick={toggleAdminWindow}
						type="button"
					>
						<i class="bi bi-gear me-1"></i>
						Admin
					</button>
				</div>
				<div class="card-body">
					<p class="card-text">
						View forecast data and analytics.
					</p>
					
					<div class="mt-4">
						<h5>Forecast Information</h5>
						<p class="text-muted">
							Content for forecast section will be displayed here.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Admin Window Sidebar -->
{#if showAdminWindow}
	<!-- Backdrop -->
	<div 
		class="position-fixed top-0 start-0 w-100 h-100"
		style="background-color: rgba(0,0,0,0.5); z-index: 1040;"
		role="button"
		tabindex="0"
		onclick={toggleAdminWindow}
		onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleAdminWindow() : null}
		aria-label="Close admin panel"
		transition:fade={{ duration: 300 }}
	></div>
	
	<!-- Sidebar Panel -->
	<div 
		class="position-fixed top-0 start-0 h-100 bg-white shadow-lg"
		style="width: 400px; max-width: 90vw; z-index: 1050; overflow-y: auto;"
		role="dialog"
		aria-modal="true"
		aria-label="Admin panel"
		onclick={(e) => e.stopPropagation()}
		transition:slide={{ axis: 'x', duration: 300 }}
	>
		<div class="d-flex flex-column h-100">
			<div class="p-3 border-bottom">
				<div class="d-flex justify-content-between align-items-center">
					<h5 class="mb-0">
						<i class="bi bi-gear me-2"></i>
						Admin Panel
					</h5>
					{#if isSaving}
						<span class="badge bg-info">
							<i class="bi bi-arrow-repeat spin me-1"></i>
							Saving...
						</span>
					{/if}
				</div>
			</div>
			
			<!-- Navigation Tabs -->
			<div class="p-3 border-bottom">
				<div class="btn-group w-100" role="group">
					<button
						type="button"
						class="btn btn-sm flex-fill {activeScreen === 'groupings' ? 'btn-primary' : 'btn-outline-primary'}"
						onclick={() => setActiveScreen('groupings')}
					>
						<i class="bi bi-collection me-1"></i>
						Groupings
					</button>
					<button
						type="button"
						class="btn btn-sm flex-fill {activeScreen === 'teammates' ? 'btn-primary' : 'btn-outline-primary'}"
						onclick={() => setActiveScreen('teammates')}
					>
						<i class="bi bi-people me-1"></i>
						Teammates
					</button>
				</div>
			</div>

			<!-- Content Area -->
			<div class="p-3 flex-grow-1 overflow-auto">
				{#if activeScreen === 'groupings'}
					<div>
						<h6 class="mb-3">
							<i class="bi bi-collection me-2"></i>
							Groupings
						</h6>
						
						<!-- Contracts -->
						<div class="mb-4">
							<label for="contract-input" class="form-label fw-bold small">Contracts</label>
							<div class="input-group input-group-sm mb-2">
								<input
									id="contract-input"
									type="text"
									class="form-control"
									placeholder="Enter contract name"
									bind:value={contractInput}
									onkeydown={(e) => e.key === 'Enter' && addContract()}
								/>
								<button class="btn btn-outline-primary" type="button" onclick={addContract} aria-label="Add contract">
									<i class="bi bi-plus"></i>
								</button>
							</div>
							{#if contracts.length > 0}
								<div class="d-flex flex-wrap gap-1">
									{#each contracts as contract, index}
										<span class="badge bg-primary d-flex align-items-center gap-1">
											{contract}
											<button
												type="button"
												class="btn-close btn-close-white"
												style="font-size: 0.6em;"
												onclick={() => removeContract(index)}
												aria-label="Remove"
											></button>
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Expense Types -->
						<div class="mb-4">
							<label for="expense-type-input" class="form-label fw-bold small">Expense Types</label>
							<div class="input-group input-group-sm mb-2">
								<input
									id="expense-type-input"
									type="text"
									class="form-control"
									placeholder="Enter expense type"
									bind:value={expenseTypeInput}
									onkeydown={(e) => e.key === 'Enter' && addExpenseType()}
								/>
								<button class="btn btn-outline-primary" type="button" onclick={addExpenseType} aria-label="Add expense type">
									<i class="bi bi-plus"></i>
								</button>
							</div>
							{#if expenseTypes.length > 0}
								<div class="d-flex flex-wrap gap-1">
									{#each expenseTypes as expenseType, index}
										<span class="badge bg-primary d-flex align-items-center gap-1">
											{expenseType}
											<button
												type="button"
												class="btn-close btn-close-white"
												style="font-size: 0.6em;"
												onclick={() => removeExpenseType(index)}
												aria-label="Remove"
											></button>
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Company -->
						<div class="mb-4">
							<label for="company-input" class="form-label fw-bold small">Company</label>
							<div class="input-group input-group-sm mb-2">
								<input
									id="company-input"
									type="text"
									class="form-control"
									placeholder="Enter company name"
									bind:value={companyInput}
									onkeydown={(e) => e.key === 'Enter' && addCompany()}
								/>
								<button class="btn btn-outline-primary" type="button" onclick={addCompany} aria-label="Add company">
									<i class="bi bi-plus"></i>
								</button>
							</div>
							{#if companies.length > 0}
								<div class="d-flex flex-wrap gap-1">
									{#each companies as company, index}
										<span class="badge bg-primary d-flex align-items-center gap-1">
											{company}
											<button
												type="button"
												class="btn-close btn-close-white"
												style="font-size: 0.6em;"
												onclick={() => removeCompany(index)}
												aria-label="Remove"
											></button>
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Resource Groups -->
						<div class="mb-4">
							<label for="resource-group-input" class="form-label fw-bold small">Resource Groups</label>
							<div class="input-group input-group-sm mb-2">
								<input
									id="resource-group-input"
									type="text"
									class="form-control"
									placeholder="Enter resource group"
									bind:value={resourceGroupInput}
									onkeydown={(e) => e.key === 'Enter' && addResourceGroup()}
								/>
								<button class="btn btn-outline-primary" type="button" onclick={addResourceGroup} aria-label="Add resource group">
									<i class="bi bi-plus"></i>
								</button>
							</div>
							{#if resourceGroups.length > 0}
								<div class="d-flex flex-wrap gap-1">
									{#each resourceGroups as resourceGroup, index}
										<span class="badge bg-primary d-flex align-items-center gap-1">
											{resourceGroup}
											<button
												type="button"
												class="btn-close btn-close-white"
												style="font-size: 0.6em;"
												onclick={() => removeResourceGroup(index)}
												aria-label="Remove"
											></button>
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Resource Types -->
						<div class="mb-4">
							<label for="resource-type-input" class="form-label fw-bold small">Resource Types</label>
							<div class="input-group input-group-sm mb-2">
								<input
									id="resource-type-input"
									type="text"
									class="form-control"
									placeholder="Enter resource type"
									bind:value={resourceTypeInput}
									onkeydown={(e) => e.key === 'Enter' && addResourceType()}
								/>
								<button class="btn btn-outline-primary" type="button" onclick={addResourceType} aria-label="Add resource type">
									<i class="bi bi-plus"></i>
								</button>
							</div>
							{#if resourceTypes.length > 0}
								<div class="d-flex flex-wrap gap-1">
									{#each resourceTypes as resourceType, index}
										<span class="badge bg-primary d-flex align-items-center gap-1">
											{resourceType}
											<button
												type="button"
												class="btn-close btn-close-white"
												style="font-size: 0.6em;"
												onclick={() => removeResourceType(index)}
												aria-label="Remove"
											></button>
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else if activeScreen === 'teammates'}
					<div>
						<h6 class="mb-3">
							<i class="bi bi-people me-2"></i>
							Teammates
						</h6>
						<p class="text-muted">Manage teammates here.</p>
						<!-- Teammates content will go here -->
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

