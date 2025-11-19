<script>
	import { slide, fade } from 'svelte/transition';
	import { generateClient } from 'aws-amplify/data';
	import '$lib/amplify';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	
	Chart.register(...registerables);

	const client = generateClient();
	
	let showAdminWindow = $state(false);
	let activeScreen = $state('groupings'); // 'groupings' or 'teammates'
	let activeTeammateScreen = $state('add'); // 'add' or 'existing'
	let selectedYear = $state(2025);
	let plusValue = $state('1');

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
				// Initialize charts after data loads
				setTimeout(() => {
					updateChart();
					updateOpexCapexChart();
				}, 500);
			}, 200);
		}
	});

	// Reactive statement to update charts when data changes or visibility changes
	$effect(() => {
		// Track visibility changes
		const currentVisibleChart = visibleChart;
		
		// Destroy charts when they become hidden
		if (currentVisibleChart !== 'total' && chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
		if (currentVisibleChart !== 'opexcapex' && opexCapexChartInstance) {
			opexCapexChartInstance.destroy();
			opexCapexChartInstance = null;
		}
		
		if (browser && currentVisibleChart === 'total' && chartCanvas && teammates.length > 0) {
			// Track dependencies
			selectedYear;
			forecastData;
			teammates;
			plusValue;
			// Small delay to ensure canvas is rendered
			setTimeout(() => {
				updateChart();
			}, 50);
		}
		if (browser && currentVisibleChart === 'opexcapex' && opexCapexChartCanvas && teammates.length > 0) {
			// Track dependencies
			selectedYear;
			forecastData;
			teammates;
			plusValue;
			// Small delay to ensure canvas is rendered
			setTimeout(() => {
				updateOpexCapexChart();
			}, 50);
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
	let teammateContracts = $state('');
	let teammateExpenseTypes = $state('');
	let teammateCompanies = $state('');
	let teammateResourceGroups = $state('');
	let teammateResourceTypes = $state('');

	// Load teammates from database
	async function loadTeammates() {
		if (!browser) return;
		
		if (!client.models.Teammate) {
			console.warn('Teammate model not found. Schema may need to be deployed.');
			isLoadingTeammates = false;
			return;
		}
		
		isLoadingTeammates = true;
		try {
			const result = await client.models.Teammate.list();
			teammates = result.data || [];
		} catch (error) {
			console.error('Error loading teammates:', error);
			teammates = [];
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
		if (!teammateContracts || !teammateExpenseTypes || 
		    !teammateCompanies || !teammateResourceGroups || 
		    !teammateResourceTypes) {
			alert('All groupings associations are required');
			return;
		}

		isSaving = true;
		try {
			const data = {
				name: teammateName.trim(),
				baseRate: parseFloat(teammateBaseRate),
				contracts: [teammateContracts],
				expenseTypes: [teammateExpenseTypes],
				companies: [teammateCompanies],
				resourceGroups: [teammateResourceGroups],
				resourceTypes: [teammateResourceTypes],
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
		teammateContracts = '';
		teammateExpenseTypes = '';
		teammateCompanies = '';
		teammateResourceGroups = '';
		teammateResourceTypes = '';
		editingTeammateId = null;
		isEditingTeammate = false;
	}

	function editTeammate(teammate) {
		teammateName = teammate.name;
		teammateBaseRate = teammate.baseRate?.toString() || '';
		teammateContracts = teammate.contracts?.[0] || '';
		teammateExpenseTypes = teammate.expenseTypes?.[0] || '';
		teammateCompanies = teammate.companies?.[0] || '';
		teammateResourceGroups = teammate.resourceGroups?.[0] || '';
		teammateResourceTypes = teammate.resourceTypes?.[0] || '';
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

	function calculateCellValue(teammate, month) {
		const forecastValue = getForecastValue(teammate.id, month);
		if (!forecastValue || forecastValue === '') {
			return '';
		}
		const numValue = parseFloat(forecastValue);
		if (isNaN(numValue)) {
			return '';
		}
		const baseRate = teammate.baseRate || 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		const result = baseRate * numValue * 173.33 * plusMultiplier;
		return Math.round(result).toLocaleString('en-US');
	}

	function calculateColumnTotal(month) {
		if (!teammates || teammates.length === 0) {
			return '';
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					const baseRate = teammate.baseRate || 0;
					total += baseRate * numValue * 173.33 * plusMultiplier;
				}
			}
		});
		return Math.round(total).toLocaleString('en-US');
	}

	function calculateGrandTotal() {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let grandTotal = 0;
		months.forEach(month => {
			const monthTotal = getColumnTotalNumeric(month);
			grandTotal += monthTotal;
		});
		return grandTotal;
	}

	function getColumnTotalNumeric(month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					const baseRate = teammate.baseRate || 0;
					total += baseRate * numValue * 173.33 * plusMultiplier;
				}
			}
		});
		return Math.round(total);
	}

	// Chart instances
	let chartCanvas = $state(null);
	let chartInstance = null;
	let opexCapexChartCanvas = $state(null);
	let opexCapexChartInstance = null;
	const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

	// Chart visibility - only one chart visible at a time
	let visibleChart = $state('dataonly'); // 'dataonly', 'total', or 'opexcapex'

	// Categorize expense types as OPEX or CAPEX
	// This can be customized based on your expense type naming
	function isOpex(expenseType) {
		if (!expenseType) return true; // Default to OPEX if not specified
		const opexKeywords = ['opex', 'operating', 'operational', 'expense', 'maintenance', 'support'];
		const lowerExpenseType = expenseType.toLowerCase();
		return opexKeywords.some(keyword => lowerExpenseType.includes(keyword));
	}

	function getOpexTotalNumeric(month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					// Check if teammate has any OPEX expense types
					const hasOpex = teammate.expenseTypes && teammate.expenseTypes.length > 0 
						? teammate.expenseTypes.some(et => isOpex(et))
						: true; // Default to OPEX if no expense types specified
					
					if (hasOpex) {
						const baseRate = teammate.baseRate || 0;
						total += baseRate * numValue * 173.33 * plusMultiplier;
					}
				}
			}
		});
		return Math.round(total);
	}

	function getCapexTotalNumeric(month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					// Check if teammate has any CAPEX expense types
					const hasCapex = teammate.expenseTypes && teammate.expenseTypes.length > 0 
						? teammate.expenseTypes.some(et => !isOpex(et))
						: false; // Default to not CAPEX if no expense types specified
					
					if (hasCapex) {
						const baseRate = teammate.baseRate || 0;
						total += baseRate * numValue * 173.33 * plusMultiplier;
					}
				}
			}
		});
		return Math.round(total);
	}

	function getChartData() {
		return months.map(month => getColumnTotalNumeric(month));
	}

	function updateChart() {
		if (!chartCanvas || !browser) return;
		
		const data = getChartData();
		
		if (chartInstance) {
			chartInstance.data.datasets[0].data = data;
			chartInstance.update();
		} else {
			const ctx = chartCanvas.getContext('2d');
			chartInstance = new Chart(ctx, {
				type: 'line',
				data: {
					labels: months,
					datasets: [{
						label: 'Total Forecast',
						data: data,
						borderColor: 'rgb(75, 192, 192)',
						backgroundColor: 'rgba(75, 192, 192, 0.2)',
						fill: true,
						tension: 0.4
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function(context) {
									return '$' + context.parsed.y.toLocaleString('en-US');
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function(value) {
									return '$' + value.toLocaleString('en-US');
								}
							}
						}
					}
				}
			});
		}
	}

	function updateOpexCapexChart() {
		if (!opexCapexChartCanvas || !browser) return;
		
		const opexData = months.map(month => getOpexTotalNumeric(month));
		const capexData = months.map(month => getCapexTotalNumeric(month));
		
		if (opexCapexChartInstance) {
			opexCapexChartInstance.data.datasets[0].data = opexData;
			opexCapexChartInstance.data.datasets[1].data = capexData;
			opexCapexChartInstance.update();
		} else {
			const ctx = opexCapexChartCanvas.getContext('2d');
			opexCapexChartInstance = new Chart(ctx, {
				type: 'line',
				data: {
					labels: months,
					datasets: [
						{
							label: 'OPEX',
							data: opexData,
							borderColor: 'rgb(54, 162, 235)',
							backgroundColor: 'rgba(54, 162, 235, 0.2)',
							fill: true,
							tension: 0.4
						},
						{
							label: 'CAPEX',
							data: capexData,
							borderColor: 'rgb(255, 99, 132)',
							backgroundColor: 'rgba(255, 99, 132, 0.2)',
							fill: true,
							tension: 0.4
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function(context) {
									return context.dataset.label + ': $' + context.parsed.y.toLocaleString('en-US');
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function(value) {
									return '$' + value.toLocaleString('en-US');
								}
							}
						}
					}
				}
			});
		}
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

	function setAssociation(arrayName, value) {
		switch(arrayName) {
			case 'contracts':
				teammateContracts = teammateContracts === value ? '' : value;
				break;
			case 'expenseTypes':
				teammateExpenseTypes = teammateExpenseTypes === value ? '' : value;
				break;
			case 'companies':
				teammateCompanies = teammateCompanies === value ? '' : value;
				break;
			case 'resourceGroups':
				teammateResourceGroups = teammateResourceGroups === value ? '' : value;
				break;
			case 'resourceTypes':
				teammateResourceTypes = teammateResourceTypes === value ? '' : value;
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
							<label for="plus-input" class="form-label mb-0 small">+</label>
							<input
								id="plus-input"
								type="text"
								class="form-control form-control-sm"
								style="width: 60px;"
								placeholder="0"
								bind:value={plusValue}
							/>
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
						<!-- Chart Visibility Toggle -->
						<div class="mb-3 d-flex justify-content-between align-items-center">
							<div class="btn-group" role="group" aria-label="Chart visibility toggle">
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'dataonly' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'dataonly'}
									aria-pressed={visibleChart === 'dataonly'}
								>
									<i class="bi bi-table me-1"></i>
									Data Only
								</button>
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'total' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'total'}
									aria-pressed={visibleChart === 'total'}
								>
									<i class="bi bi-graph-up-arrow me-1"></i>
									Total Forecast
								</button>
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'opexcapex' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'opexcapex'}
									aria-pressed={visibleChart === 'opexcapex'}
								>
									<i class="bi bi-graph-up me-1"></i>
									OPEX/CAPEX
								</button>
							</div>
							<div class="text-end">
								<strong class="small text-muted">Grand Total: </strong>
								<span class="fw-bold">${calculateGrandTotal().toLocaleString('en-US')}</span>
							</div>
						</div>

						<!-- Total Forecast Area Chart -->
						{#if visibleChart === 'total'}
							<div class="mb-4" style="height: 300px;">
								<canvas bind:this={chartCanvas}></canvas>
							</div>
						{/if}

						<!-- OPEX/CAPEX Area Chart -->
						{#if visibleChart === 'opexcapex'}
							<div class="mb-4" style="height: 300px;">
								<canvas bind:this={opexCapexChartCanvas}></canvas>
							</div>
						{/if}
						
						<div class="table-responsive">
							<table class="table table-sm table-hover table-bordered forecast-table small text-muted">
								<thead>
									<tr class="table-light">
										<th class="text-end">{selectedYear}</th>
										<th class="text-end">JAN</th>
										<th class="text-end">FEB</th>
										<th class="text-end">MAR</th>
										<th class="text-end">APR</th>
										<th class="text-end">MAY</th>
										<th class="text-end">JUN</th>
										<th class="text-end">JUL</th>
										<th class="text-end">AUG</th>
										<th class="text-end">SEP</th>
										<th class="text-end">OCT</th>
										<th class="text-end">NOV</th>
										<th class="text-end">DEC</th>
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
										{@const monthsArray = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']}
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
												<span class="float-end">
													<i 
														class="bi bi-info-circle text-info ms-1" 
														style="cursor: help; font-size: 0.875rem;"
														data-bs-toggle="tooltip"
														data-bs-html="true"
														data-bs-placement="top"
														title={tooltipContent}
														aria-label="View grouping values"
													></i>
												</span>
											</td>
											{#each monthsArray as month}
												{@const cellValue = calculateCellValue(teammate, month)}
												<td class="text-nowrap text-end">
													{cellValue ? `$${cellValue}` : ''}
												</td>
											{/each}
										</tr>
										{#if isExpanded}
											<tr class="table-light">
												<td class="text-nowrap small text-muted"></td>
												{#each monthsArray as month}
													<td class="text-nowrap text-end">
														<input
															type="text"
															class="form-control form-control-sm text-end"
															placeholder="0"
															value={getForecastValue(teammate.id, month)}
															oninput={(e) => setForecastValue(teammate.id, month, e.target.value)}
														/>
													</td>
												{/each}
											</tr>
										{/if}
									{/each}
									<!-- Totals Row -->
									<tr class="fw-bold">
										<td class="text-nowrap text-end">Total</td>
										{#each ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as month}
											<td class="text-nowrap text-end">
												{(() => {
													const total = calculateColumnTotal(month);
													return total ? `$${total}` : '';
												})()}
											</td>
										{/each}
									</tr>
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
		tabindex="0"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			e.stopPropagation();
			if (e.key === 'Escape') {
				toggleAdminWindow();
			}
		}}
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
						class="btn btn-sm flex-fill {activeScreen === 'groupings' ? 'btn-secondary' : 'btn-outline-secondary'}"
						onclick={() => setActiveScreen('groupings')}
					>
						<i class="bi bi-collection me-1"></i>
						Groupings
					</button>
					<button
						type="button"
						class="btn btn-sm flex-fill {activeScreen === 'teammates' ? 'btn-secondary' : 'btn-outline-secondary'}"
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
										<span class="badge bg-secondary d-flex align-items-center gap-1">
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
										<span class="badge bg-secondary d-flex align-items-center gap-1">
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
										<span class="badge bg-secondary d-flex align-items-center gap-1">
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
										<span class="badge bg-secondary d-flex align-items-center gap-1">
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
										<span class="badge bg-secondary d-flex align-items-center gap-1">
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
									class="btn btn-sm flex-fill {activeTeammateScreen === 'add' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => { activeTeammateScreen = 'add'; resetTeammateForm(); }}
								>
									<i class="bi bi-person-plus me-1"></i>
									Add Teammate
								</button>
								<button
									type="button"
									class="btn btn-sm flex-fill {activeTeammateScreen === 'existing' ? 'btn-secondary' : 'btn-outline-secondary'}"
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
									<div class="form-label small fw-bold">Contract *</div>
									<div class="d-flex flex-wrap gap-1">
										{#each contracts as contract}
											<button
												type="button"
												class="btn btn-xs {teammateContracts === contract ? 'btn-secondary' : 'btn-outline-secondary'}"
												style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
												onclick={() => setAssociation('contracts', contract)}
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
									<div class="form-label small fw-bold">Expense Type *</div>
									<div class="d-flex flex-wrap gap-1">
										{#each expenseTypes as expenseType}
											<button
												type="button"
												class="btn btn-xs {teammateExpenseTypes === expenseType ? 'btn-secondary' : 'btn-outline-secondary'}"
												style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
												onclick={() => setAssociation('expenseTypes', expenseType)}
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
									<div class="form-label small fw-bold">Company *</div>
									<div class="d-flex flex-wrap gap-1">
										{#each companies as company}
											<button
												type="button"
												class="btn btn-xs {teammateCompanies === company ? 'btn-secondary' : 'btn-outline-secondary'}"
												style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
												onclick={() => setAssociation('companies', company)}
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
									<div class="form-label small fw-bold">Resource Group *</div>
									<div class="d-flex flex-wrap gap-1">
										{#each resourceGroups as resourceGroup}
											<button
												type="button"
												class="btn btn-xs {teammateResourceGroups === resourceGroup ? 'btn-secondary' : 'btn-outline-secondary'}"
												style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
												onclick={() => setAssociation('resourceGroups', resourceGroup)}
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
									<div class="form-label small fw-bold">Resource Type *</div>
									<div class="d-flex flex-wrap gap-1">
										{#each resourceTypes as resourceType}
											<button
												type="button"
												class="btn btn-xs {teammateResourceTypes === resourceType ? 'btn-secondary' : 'btn-outline-secondary'}"
												style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
												onclick={() => setAssociation('resourceTypes', resourceType)}
											>
												{resourceType}
											</button>
										{/each}
										{#if resourceTypes.length === 0}
											<small class="text-muted">No resource types available. Add them in Groupings.</small>
										{/if}
									</div>
								</div>

								<div class="d-flex gap-2 justify-content-end">
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

