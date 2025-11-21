<script>
  import { generateClient } from 'aws-amplify/data';
  import '$lib/amplify';
  import { browser } from '$app/environment';

  const client = generateClient();
  
  let todos = $state([]);
  let channel;
  let isLoading = $state(true);
  let error = $state(null);
  let isDynamoDBConnected = $state(false);	
  
  async function checkDynamoDBConnection() {
    try {
      // Try a simple query to check if DynamoDB is accessible
      await client.models.Todo.list({ limit: 1 });
      isDynamoDBConnected = true;
    } catch (err) {
      isDynamoDBConnected = false;
    }
  }

  // Set up Broadcast Channel for cross-window communication
  $effect(() => {
    if (browser) {
      channel = new BroadcastChannel('todo-updates');
      
      // Listen for updates from other windows
      channel.onmessage = (event) => {
        if (event.data === 'refresh') {
          loadTodos();
        }
      };

      // Check connection and load todos
      checkDynamoDBConnection();
      loadTodos(); // Initial load

      return () => channel.close();
    }
  });

  function notifyOtherWindows() {
    if (channel) {
      channel.postMessage('refresh');
    }
  }
</script>



<div class="container mt-5">
	<div class="row justify-content-center">
		<div class="col-md-8">
			<div class="card">
				<div class="card-header">
					<h1 class="card-title mb-0">
						<i class="bi bi-bullseye text-danger me-2"></i>
						AWS Uturn AIT
					</h1>
				</div>
				<div class="card-body">
					<p class="card-text">
						Welcome to your SvelteKit application with Bootstrap & DynamoDB integration.
					</p>
					
					<div class="mt-4">
						<h5>Features</h5>
						<div class="row">
							<div class="col-md-6">
								<div class="alert alert-info" role="alert">
									<i class="bi bi-info-circle me-2"></i>
									SvelteKit Framework
								</div>
							</div>
							<div class="col-md-6">
								<div class="alert alert-info" role="alert">
									<i class="bi bi-info-circle me-2"></i>
									Bootstrap UI Components
								</div>
							</div>
						</div>
						<div class="row">
							<div class="col-md-6">
								{#if isDynamoDBConnected}
									<div class="alert alert-success" role="alert">
										<i class="bi bi-check-circle me-2"></i>
										DynamoDB: Connected
									</div>
								{:else}
									<div class="alert alert-danger" role="alert">
										<i class="bi bi-x-circle me-2"></i>
										DynamoDB: Disconnected
									</div>
								{/if}
							</div>
						</div>
						
						<div class="mt-3">
							<h5>Documentation</h5>
							<a href="https://svelte.dev/docs/kit" class="btn btn-outline-secondary me-2" target="_blank">
								<i class="bi bi-book me-1"></i> SvelteKit
							</a>
							<a href="https://getbootstrap.com/docs/5.3/" class="btn btn-outline-secondary" target="_blank">
								<i class="bi bi-bootstrap me-1"></i> Bootstrap
							</a>
						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
</div> 