<script>
	import { fade, fly } from 'svelte/transition';
	import { page, modalOpen } from './stores.js';
	import days from './days.js';

	let pageNum;
	// export let modalOpen;

	const unsubscribe = page.subscribe(value => {
		pageNum = value;
	});


	function switchPage(e,num, done){
		e.preventDefault();
		if (!done) {
			modalOpen.update(n => n = true);
			return;
		}
		page.update(n => n = num)

		const pages = document.getElementsByClassName('page');
		for (let i = 0; i < pages.length; i++){
			pages[i].style.display = 'none';
		}
		document.getElementById(`${pageNum}`).style.display = 'block';

		modalOpen.update(n => n = false);
	}

	function closeModal(e){
		e.preventDefault();

		modalOpen.update(n => false);
	}
</script>
<div class="modal-area" on:click={(e)=> closeModal(e)}>
	<div class="modal" transition:fly="{{ x: -510, duration: 750 }}">
		<ul>
			{#each Object.values(days) as day}
				<li class={!day.completed ? "not-done" : ""} on:click={(e)=>switchPage(e, day.day, day.completed)}>
					{day.title}
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.modal-area{
		position: absolute;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
		z-index: 10;
		overflow:scroll;
	}
  .modal {
		width: 280px;
		background: black;
		color: white;
    /* position: absolute; */
		margin-left: none;
		overflow: auto;
	}

	li {
		list-style: none;
		cursor: pointer;
		width: 100%;
		padding-right: 20px;
		padding-top: 5px;
	}

	.not-done {
		color: red;
		cursor: not-allowed;
	}

</style>