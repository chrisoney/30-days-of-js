<script>
	function removeTransition(e) {
		e.preventDefault();
    if (e.propertyName !== 'transform') return;
    e.target.classList.remove('playing');
  }

  function playSound(e) {
		e.preventDefault();
    const audio = document.querySelector(`audio[data-key="${e.keyCode}"]`);
		const key = document.querySelector(`div[data-key="${e.keyCode}"]`);
    if (!audio) return;

    key.classList.add('playing');
    audio.currentTime = 0;
    audio.play();
  }

  const keys = Array.from(document.querySelectorAll('.key'));
  keys.forEach(key => key.addEventListener('transitionend', removeTransition));
  document.addEventListener('keydown', playSound);
</script>

<div class="day-main">
  <div class="keys">
    <div data-key="65" class="key">
      <kbd>A</kbd>
      <span class="sound">clap</span>
    </div>
    <div data-key="83" class="key">
      <kbd>S</kbd>
      <span class="sound">hihat</span>
    </div>
    <div data-key="68" class="key">
      <kbd>D</kbd>
      <span class="sound">kick</span>
    </div>
    <div data-key="70" class="key">
      <kbd>F</kbd>
      <span class="sound">openhat</span>
    </div>
    <div data-key="71" class="key">
      <kbd>G</kbd>
      <span class="sound">boom</span>
    </div>
    <div data-key="72" class="key">
      <kbd>H</kbd>
      <span class="sound">ride</span>
    </div>
    <div data-key="74" class="key">
      <kbd>J</kbd>
      <span class="sound">snare</span>
    </div>
    <div data-key="75" class="key">
      <kbd>K</kbd>
      <span class="sound">tom</span>
    </div>
    <div data-key="76" class="key">
      <kbd>L</kbd>
      <span class="sound">tink</span>
    </div>
  </div>

  <audio data-key="65" src="sounds/clap.wav"><track kind="captions"></audio>
  <audio data-key="83" src="sounds/hihat.wav"><track kind="captions"></audio>
  <audio data-key="68" src="sounds/kick.wav"><track kind="captions"></audio>
  <audio data-key="70" src="sounds/openhat.wav"><track kind="captions"></audio>
  <audio data-key="71" src="sounds/boom.wav"><track kind="captions"></audio>
  <audio data-key="72" src="sounds/ride.wav"><track kind="captions"></audio>
  <audio data-key="74" src="sounds/snare.wav"><track kind="captions"></audio>
  <audio data-key="75" src="sounds/tom.wav"><track kind="captions"></audio>
  <audio data-key="76" src="sounds/tink.wav"><track kind="captions"></audio>
</div>

<style>
  .day-main{
		/* margin-top: 10px; */
		height:100%;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 10px;
  	background: url('https://i.imgur.com/b9r5sEL.jpg') bottom center;
  	background-size: cover;
	}

	.keys {
  display: flex;
  flex: 1;
  min-height: 100vh;
  align-items: center;
	justify-content: center;
	font-family: sans-serif;
	}

	.key {
		border: .4rem solid black;
		border-radius: .5rem;
		margin: 1rem;
		font-size: 1.5rem;
		padding: 1rem .5rem;
		transition: all .07s ease;
		width: 10rem;
		text-align: center;
		color: white;
		background: rgba(0,0,0,0.4);
		text-shadow: 0 0 .5rem black;
	}

	.playing {
		transform: scale(1.1);
		border-color: #ffc600;
		box-shadow: 0 0 1rem #ffc600;
	}

	kbd {
		display: block;
		font-size: 4rem;
	}

	.sound {
		font-size: 1.2rem;
		text-transform: uppercase;
		letter-spacing: .1rem;
		color: #ffc600;
	}

</style>