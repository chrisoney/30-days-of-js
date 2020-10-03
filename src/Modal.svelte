<script>
	import days from './days.js';
</script>

<div class="modal">
	<ul>
		{#each Object.values(days).slice(1) as day}
			<li>
				{day.title}
			</li>
		{/each}
	</ul>
</div>

<style>

  .modal {
    background: blue;
    z-index: 1;
    position: absolute;
    margin-left: none;
  }

	li {
		list-style: none;
		cursor: pointer;
	}

</style>