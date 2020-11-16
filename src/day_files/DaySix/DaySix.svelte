<script>
	const endpoint = 'https://gist.githubusercontent.com/Miserlou/c5cd8364bf9b2420bb29/raw/2bf258763cdddd704f8ffd3ea9a3e81d25e2c6f6/cities.json';
	const cities = [];
	fetch(endpoint)
		.then(blob => blob.json())
		.then(data => cities.push(...data))


	function findMatches(word, cities){
		return cities.filter(place => {
			const regex = new RegExp(word, 'gi');
			return place.city.match(regex) || place.state.match(regex);
		})
	}

	function displayMatches(){

	}
</script>

<div class="day-main">
  <form class="search-form">
    <input type="text" class="search" placeholder="City or State">
    <ul class="suggestions">
      <li>Filter for a city</li>
      <li>or a state</li>
    </ul>
  </form>
</div>

<style>
  .day-main{
		height:100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>