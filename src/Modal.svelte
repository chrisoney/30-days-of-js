<script>
	import { fade, fly } from 'svelte/transition';
	import days from './days.js';
</script>

<div class="modal" transition:fly="{{ x: -510, duration: 750 }}">
	<ul>
		{#each Object.values(days) as day}
			<li>
				{day.title}
			</li>
		{/each}
	</ul>
</div>

<style>

  .modal {
		background: black;
		color: white;
    z-index: 1;
    position: absolute;
    margin-left: none;
  }

	li {
		list-style: none;
		cursor: pointer;
	}

</style>