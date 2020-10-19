<script>
	import { fade, fly } from 'svelte/transition';
	import { page, modalOpen } from './stores.js';
	import days from './days.js';

	let pageNum;
	// export let modalOpen;

	const unsubscribe = page.subscribe(value => {
		pageNum = value;
	});


	function switchPage(e,num){
		e.preventDefault();
		page.update(n => n = num)

		const pages = document.getElementsByClassName('page');
		for (let i = 0; i < pages.length; i++){
			pages[i].style.visibility = 'hidden';
		}
		document.getElementById(`${pageNum}`).style.visibility = 'visible';

		modalOpen.update(n => n = false);
	}
</script>

<div class="modal" transition:fly="{{ x: -510, duration: 750 }}">
	<ul>
		{#each Object.values(days) as day}
			<li on:click={(e)=>switchPage(e, day.day)}>
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