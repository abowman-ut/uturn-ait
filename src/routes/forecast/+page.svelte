<script>
	import { slide, fade } from 'svelte/transition';
	import { generateClient } from 'aws-amplify/data';
	import '$lib/amplify';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const client = generateClient();
	
	let showAdminWindow = $state(false);
	let activeScreen = $state('groupings'); // 'groupings' or 'teammates'
	let activeTeammateScreen = $state('add'); // 'add' or 'existing'
	let selectedYear = $state(2025);

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

	// Initialize Bootstrap tooltips
	function initTooltips() {
		if (!browser || typeof window.bootstrap === 'undefined') return;
		
		// Destroy existing tooltips first
		const existingTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
		existingTooltips.forEach(el => {
			const tooltipInstance = window.bootstrap.Tooltip.getInstance(el);
			if (tooltipInstance) {
				tooltipInstance.dispose();
			}
		});
		
		// Initialize new tooltips
		const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
		tooltipTriggerList.forEach(tooltipTriggerEl => {
			new window.bootstrap.Tooltip(tooltipTriggerEl);
		});
	}

	// Load on mount
	onMount(() => {
		loadGroupings();
		loadTeammates();
		loadForecastData();
		
		// Initialize Bootstrap tooltips after DOM is ready
		if (browser) {
			setTimeout(() => {
				initTooltips();
			}, 200);
		}
	});

	// Reload forecast data when year changes
	$effect(() => {
		if (browser && selectedYear) {
			loadForecastData();
		}
	});

	// Re-initialize tooltips when teammates data changes
	$effect(() => {
		if (browser && teammates.length > 0) {
			setTimeout(() => {
				initTooltips();
			}, 100);
		}
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

	// Teammates data
	let teammates = $state([]);
	let isLoadingTeammates = $state(false);
	let isEditingTeammate = $state(false);
	let editingTeammateId = $state(null);
	
	// Expanded rows for forecast data entry
	let expandedRows = $state(new Set());
	let forecastData = $state({}); // Structure: { teammateId_year: { month: value } }
	let teammateName = $state('');
	let teammateBaseRate = $state('');
	let teammateContracts = $state([]);
	let teammateExpenseTypes = $state([]);
	let teammateCompanies = $state([]);
	let teammateResourceGroups = $state([]);
	let teammateResourceTypes = $state([]);

	// Load teammates from database
	async function loadTeammates() {
		if (!browser) return;
		
		if (!client.models.Teammate) {
			console.warn('Teammate model not found. Schema may need to be deployed.');
			return;
		}
		
		isLoadingTeammates = true;
		try {
			const result = await client.models.Teammate.list();
			teammates = result.data || [];
		} catch (error) {
			console.error('Error loading teammates:', error);
		} finally {
			isLoadingTeammates = false;
		}
	}

	// Save teammate to database
	async function saveTeammate() {
		if (!browser) return;
		
		if (!client.models.Teammate) {
			alert('Teammate model not available. Please run "npx ampx sandbox" to deploy schema changes.');
			return;
		}

		// Validate required fields
		if (!teammateName.trim()) {
			alert('Name is required');
			return;
		}

		if (!teammateBaseRate || isNaN(parseFloat(teammateBaseRate))) {
			alert('Base rate must be a valid number');
			return;
		}

		// Validate required associations
		if (teammateContracts.length === 0 || teammateExpenseTypes.length === 0 || 
		    teammateCompanies.length === 0 || teammateResourceGroups.length === 0 || 
		    teammateResourceTypes.length === 0) {
			alert('All groupings associations are required');
			return;
		}

		isSaving = true;
		try {
			const data = {
				name: teammateName.trim(),
				baseRate: parseFloat(teammateBaseRate),
				contracts: teammateContracts,
				expenseTypes: teammateExpenseTypes,
				companies: teammateCompanies,
				resourceGroups: teammateResourceGroups,
				resourceTypes: teammateResourceTypes,
			};

			if (editingTeammateId) {
				await client.models.Teammate.update({
					id: editingTeammateId,
					...data,
				});
			} else {
				await client.models.Teammate.create(data);
			}

			// Reset form and switch to existing screen
			resetTeammateForm();
			await loadTeammates();
			activeTeammateScreen = 'existing';
		} catch (error) {
			console.error('Error saving teammate:', error);
			alert('Error saving teammate: ' + (error.message || error));
		} finally {
			isSaving = false;
		}
	}

	function resetTeammateForm() {
		teammateName = '';
		teammateBaseRate = '';
		teammateContracts = [];
		teammateExpenseTypes = [];
		teammateCompanies = [];
		teammateResourceGroups = [];
		teammateResourceTypes = [];
		editingTeammateId = null;
		isEditingTeammate = false;
	}

	function editTeammate(teammate) {
		teammateName = teammate.name;
		teammateBaseRate = teammate.baseRate?.toString() || '';
		teammateContracts = teammate.contracts || [];
		teammateExpenseTypes = teammate.expenseTypes || [];
		teammateCompanies = teammate.companies || [];
		teammateResourceGroups = teammate.resourceGroups || [];
		teammateResourceTypes = teammate.resourceTypes || [];
		editingTeammateId = teammate.id;
		isEditingTeammate = true;
		activeTeammateScreen = 'add'; // Switch to add screen when editing
	}

	async function deleteTeammate(id) {
		if (!confirm('Are you sure you want to delete this teammate?')) {
			return;
		}

		if (!client.models.Teammate) return;

		try {
			await client.models.Teammate.delete({ id });
			await loadTeammates();
		} catch (error) {
			console.error('Error deleting teammate:', error);
			alert('Error deleting teammate: ' + (error.message || error));
		}
	}

	function toggleRow(teammateId) {
		if (expandedRows.has(teammateId)) {
			expandedRows.delete(teammateId);
		} else {
			expandedRows.add(teammateId);
		}
		expandedRows = new Set(expandedRows); // Trigger reactivity
	}

	function getForecastValue(teammateId, month) {
		const key = `${teammateId}_${selectedYear}`;
		return forecastData[key]?.[month] || '';
	}

	async function setForecastValue(teammateId, month, value) {
		const key = `${teammateId}_${selectedYear}`;
		if (!forecastData[key]) {
			forecastData[key] = {};
		}
		forecastData[key][month] = value;
		forecastData = { ...forecastData }; // Trigger reactivity
		
		// Save to database
		await saveForecastValue(teammateId, month, value);
	}

	// Load forecast data from database
	async function loadForecastData() {
		if (!browser) return;
		
		if (!client.models.Forecast) {
			console.warn('Forecast model not found. Schema may need to be deployed.');
			return;
		}
		
		try {
			const result = await client.models.Forecast.list();
			// Organize data by teammateId_year -> month -> value
			const organized = {};
			result.data?.forEach(forecast => {
				const key = `${forecast.teammateId}_${forecast.year}`;
				if (!organized[key]) {
					organized[key] = {};
				}
				organized[key][forecast.month] = forecast.value?.toString() || '';
			});
			forecastData = organized;
		} catch (error) {
			console.error('Error loading forecast data:', error);
		}
	}

	// Save forecast value to database
	async function saveForecastValue(teammateId, month, value) {
		if (!browser) return;
		
		if (!client.models.Forecast) {
			console.warn('Forecast model not available. Schema may need to be deployed.');
			return;
		}

		try {
			// Check if a record already exists for this teammate/year/month
			const existing = await client.models.Forecast.list({
				filter: {
					teammateId: { eq: teammateId },
					year: { eq: selectedYear },
					month: { eq: month }
				}
			});

			const numValue = value ? parseFloat(value) : null;

			if (existing.data && existing.data.length > 0) {
				// Update existing record
				const record = existing.data[0];
				if (numValue === null || isNaN(numValue)) {
					// Delete if value is empty
					await client.models.Forecast.delete({ id: record.id });
				} else {
					await client.models.Forecast.update({
						id: record.id,
						value: numValue
					});
				}
			} else if (numValue !== null && !isNaN(numValue)) {
				// Create new record
				await client.models.Forecast.create({
					teammateId: teammateId,
					year: selectedYear,
					month: month,
					value: numValue
				});
			}
		} catch (error) {
			console.error('Error saving forecast value:', error);
		}
	}

	function toggleAssociation(arrayName, value) {
		let currentArray;
		switch(arrayName) {
			case 'contracts':
				currentArray = teammateContracts;
				teammateContracts = currentArray.includes(value) 
					? currentArray.filter(item => item !== value)
					: [...currentArray, value];
				break;
			case 'expenseTypes':
				currentArray = teammateExpenseTypes;
				teammateExpenseTypes = currentArray.includes(value)
					? currentArray.filter(item => item !== value)
					: [...currentArray, value];
				break;
			case 'companies':
				currentArray = teammateCompanies;
				teammateCompanies = currentArray.includes(value)
					? currentArray.filter(item => item !== value)
					: [...currentArray, value];
				break;
			case 'resourceGroups':
				currentArray = teammateResourceGroups;
				teammateResourceGroups = currentArray.includes(value)
					? currentArray.filter(item => item !== value)
					: [...currentArray, value];
				break;
			case 'resourceTypes':
				currentArray = teammateResourceTypes;
				teammateResourceTypes = currentArray.includes(value)
					? currentArray.filter(item => item !== value)
					: [...currentArray, value];
				break;
		}
	}

	// Load teammates when switching to teammates screen
	$effect(() => {
		if (activeScreen === 'teammates' && browser) {
			loadTeammates();
			// Reset to add screen when first opening teammates
			if (!isEditingTeammate) {
				activeTeammateScreen = 'add';
			}
		}
	});
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

	.forecast-table th,
	.forecast-table td {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>

<div class="container mt-5">
	<div class="row justify-content-center">
		<div class="col-md-12">
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
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h5 class="mb-0">
							<i class="bi bi-people me-2"></i>
							Teammates
						</h5>
						<div class="d-flex align-items-center gap-2">
							<label for="year-select" class="form-label mb-0 small">Year:</label>
							<select 
								id="year-select"
								class="form-select form-select-sm" 
								style="width: auto;"
								bind:value={selectedYear}
							>
								<option value={2025}>2025</option>
								<option value={2026}>2026</option>
								<option value={2027}>2027</option>
								<option value={2028}>2028</option>
								<option value={2029}>2029</option>
								<option value={2030}>2030</option>
							</select>
						</div>
					</div>
					
					{#if isLoadingTeammates}
						<div class="text-center py-3">
							<div class="spinner-border spinner-border-sm text-primary" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
						</div>
					{:else if teammates.length === 0}
						<p class="text-muted">No teammates found. Add teammates in the admin panel.</p>
					{:else}
						<div class="table-responsive">
							<table class="table table-sm table-hover table-bordered forecast-table">
								<thead>
									<tr>
										<th class="text-end">{selectedYear}</th>
										<th>Jan</th>
										<th>Feb</th>
										<th>Mar</th>
										<th>Apr</th>
										<th>May</th>
										<th>Jun</th>
										<th>Jul</th>
										<th>Aug</th>
										<th>Sep</th>
										<th>Oct</th>
										<th>Nov</th>
										<th>Dec</th>
									</tr>
								</thead>
								<tbody>
									{#each teammates as teammate}
										{@const tooltipContent = `
											<div style="text-align: left;">
												<div><strong>Contract:</strong> ${teammate.contracts?.join(', ') || 'None'}</div>
												<div><strong>Expense Type:</strong> ${teammate.expenseTypes?.join(', ') || 'None'}</div>
												<div><strong>Company:</strong> ${teammate.companies?.join(', ') || 'None'}</div>
												<div><strong>Resource Group:</strong> ${teammate.resourceGroups?.join(', ') || 'None'}</div>
												<div><strong>Resource Type:</strong> ${teammate.resourceTypes?.join(', ') || 'None'}</div>
											</div>
										`}
										{@const isExpanded = expandedRows.has(teammate.id)}
										{@const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
										<tr>
											<td class="text-nowrap">
												<button
													type="button"
													class="btn btn-sm btn-link p-0 me-1"
													onclick={() => toggleRow(teammate.id)}
													aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
												>
													<i class="bi {isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}"></i>
												</button>
												<strong>{teammate.name}</strong>
												<i 
													class="bi bi-info-circle text-info ms-1" 
													style="cursor: help; font-size: 0.875rem;"
													data-bs-toggle="tooltip"
													data-bs-html="true"
													data-bs-placement="top"
													title={tooltipContent}
													aria-label="View grouping values"
												></i>
											</td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
											<td class="text-nowrap"></td>
										</tr>
										{#if isExpanded}
											<tr class="table-light">
												<td class="text-nowrap small text-muted">Forecast</td>
												{#each months as month}
													<td class="text-nowrap">
														<input
															type="number"
															step="0.01"
															class="form-control form-control-sm"
															placeholder="0"
															value={getForecastValue(teammate.id, month)}
															oninput={(e) => setForecastValue(teammate.id, month, e.target.value)}
														/>
													</td>
												{/each}
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
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

						<!-- Sub-navigation Tabs -->
						<div class="mb-3">
							<div class="btn-group w-100" role="group">
								<button
									type="button"
									class="btn btn-sm flex-fill {activeTeammateScreen === 'add' ? 'btn-primary' : 'btn-outline-primary'}"
									onclick={() => { activeTeammateScreen = 'add'; resetTeammateForm(); }}
								>
									<i class="bi bi-person-plus me-1"></i>
									Add Teammate
								</button>
								<button
									type="button"
									class="btn btn-sm flex-fill {activeTeammateScreen === 'existing' ? 'btn-primary' : 'btn-outline-primary'}"
									onclick={() => activeTeammateScreen = 'existing'}
								>
									<i class="bi bi-list-ul me-1"></i>
									Existing Teammates
								</button>
							</div>
						</div>

						<!-- Add/Edit Teammate Form -->
						{#if activeTeammateScreen === 'add'}
						<div class="card mb-3">
							<div class="card-body">
								<h6 class="card-title">{isEditingTeammate ? 'Edit' : 'Add'} Teammate</h6>
								
								<div class="mb-3">
									<label for="teammate-name" class="form-label small fw-bold">Name *</label>
									<input
										id="teammate-name"
										type="text"
										class="form-control form-control-sm"
										placeholder="Enter teammate name"
										bind:value={teammateName}
									/>
								</div>

								<div class="mb-3">
									<label for="teammate-base-rate" class="form-label small fw-bold">Base Rate *</label>
									<input
										id="teammate-base-rate"
										type="number"
										step="0.01"
										class="form-control form-control-sm"
										placeholder="Enter base rate"
										bind:value={teammateBaseRate}
									/>
								</div>

								<!-- Groupings Associations -->
								<div class="mb-3">
									<label class="form-label small fw-bold">Contract *</label>
									<div class="d-flex flex-wrap gap-1">
										{#each contracts as contract}
											<button
												type="button"
												class="btn btn-sm {teammateContracts.includes(contract) ? 'btn-primary' : 'btn-outline-primary'}"
												onclick={() => toggleAssociation('contracts', contract)}
											>
												{contract}
											</button>
										{/each}
										{#if contracts.length === 0}
											<small class="text-muted">No contracts available. Add them in Groupings.</small>
										{/if}
									</div>
								</div>

								<div class="mb-3">
									<label class="form-label small fw-bold">Expense Type *</label>
									<div class="d-flex flex-wrap gap-1">
										{#each expenseTypes as expenseType}
											<button
												type="button"
												class="btn btn-sm {teammateExpenseTypes.includes(expenseType) ? 'btn-primary' : 'btn-outline-primary'}"
												onclick={() => toggleAssociation('expenseTypes', expenseType)}
											>
												{expenseType}
											</button>
										{/each}
										{#if expenseTypes.length === 0}
											<small class="text-muted">No expense types available. Add them in Groupings.</small>
										{/if}
									</div>
								</div>

								<div class="mb-3">
									<label class="form-label small fw-bold">Company *</label>
									<div class="d-flex flex-wrap gap-1">
										{#each companies as company}
											<button
												type="button"
												class="btn btn-sm {teammateCompanies.includes(company) ? 'btn-primary' : 'btn-outline-primary'}"
												onclick={() => toggleAssociation('companies', company)}
											>
												{company}
											</button>
										{/each}
										{#if companies.length === 0}
											<small class="text-muted">No companies available. Add them in Groupings.</small>
										{/if}
									</div>
								</div>

								<div class="mb-3">
									<label class="form-label small fw-bold">Resource Group *</label>
									<div class="d-flex flex-wrap gap-1">
										{#each resourceGroups as resourceGroup}
											<button
												type="button"
												class="btn btn-sm {teammateResourceGroups.includes(resourceGroup) ? 'btn-primary' : 'btn-outline-primary'}"
												onclick={() => toggleAssociation('resourceGroups', resourceGroup)}
											>
												{resourceGroup}
											</button>
										{/each}
										{#if resourceGroups.length === 0}
											<small class="text-muted">No resource groups available. Add them in Groupings.</small>
										{/if}
									</div>
								</div>

								<div class="mb-3">
									<label class="form-label small fw-bold">Resource Type *</label>
									<div class="d-flex flex-wrap gap-1">
										{#each resourceTypes as resourceType}
											<button
												type="button"
												class="btn btn-sm {teammateResourceTypes.includes(resourceType) ? 'btn-primary' : 'btn-outline-primary'}"
												onclick={() => toggleAssociation('resourceTypes', resourceType)}
											>
												{resourceType}
											</button>
										{/each}
										{#if resourceTypes.length === 0}
											<small class="text-muted">No resource types available. Add them in Groupings.</small>
										{/if}
									</div>
								</div>

								<div class="d-flex gap-2">
									<button
										type="button"
										class="btn btn-primary btn-sm"
										onclick={saveTeammate}
										disabled={isSaving}
									>
										{isEditingTeammate ? 'Update' : 'Add'} Teammate
									</button>
									{#if isEditingTeammate}
										<button
											type="button"
											class="btn btn-secondary btn-sm"
											onclick={resetTeammateForm}
										>
											Cancel
										</button>
									{/if}
								</div>
							</div>
						</div>
						{/if}

						<!-- Teammates List -->
						{#if activeTeammateScreen === 'existing'}
						<div>
							{#if teammates.length === 0}
								<p class="text-muted small">No teammates added yet.</p>
							{:else}
								<div class="list-group">
									{#each teammates as teammate}
										<div class="list-group-item">
											<div class="d-flex justify-content-between align-items-start">
												<div class="flex-grow-1">
													<h6 class="mb-1">{teammate.name}</h6>
													<p class="mb-1 small text-muted">Base Rate: ${teammate.baseRate?.toFixed(2) || '0.00'}</p>
													<div class="small">
														<div><strong>Contract:</strong> {teammate.contracts?.join(', ') || 'None'}</div>
														<div><strong>Expense Type:</strong> {teammate.expenseTypes?.join(', ') || 'None'}</div>
														<div><strong>Company:</strong> {teammate.companies?.join(', ') || 'None'}</div>
														<div><strong>Resource Group:</strong> {teammate.resourceGroups?.join(', ') || 'None'}</div>
														<div><strong>Resource Type:</strong> {teammate.resourceTypes?.join(', ') || 'None'}</div>
													</div>
												</div>
												<div class="d-flex gap-1">
													<button
														type="button"
														class="btn btn-sm btn-outline-primary"
														onclick={() => editTeammate(teammate)}
														aria-label="Edit teammate"
													>
														<i class="bi bi-pencil"></i>
													</button>
													<button
														type="button"
														class="btn btn-sm btn-outline-danger"
														onclick={() => deleteTeammate(teammate.id)}
														aria-label="Delete teammate"
													>
														<i class="bi bi-trash"></i>
													</button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

