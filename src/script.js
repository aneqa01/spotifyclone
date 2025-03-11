const currentSong = new Audio()
let songs
let currFolder

// Format time function (MM:SS)
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00"
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
}

// Helper functions to extract clean song and artist names
function extractSongName(filename) {
  // Remove file extension (.mp3)
  const nameWithoutExtension = filename.replace(".mp3", "")
  // Remove "128 Kbps" or any similar extra info
  const cleanName = nameWithoutExtension.replace(/-\s*\d+\s*Kbps/g, "").trim()
  // Get only the first part before the hyphen (if exists)
  return cleanName.split("-")[0].trim()
}

function extractArtistName(filename) {
  // Remove file extension
  const nameWithoutExtension = filename.replace(".mp3", "")
  // Remove "128 Kbps" or any bitrate-related info
  const cleanName = nameWithoutExtension.replace(/-\s*\d+\s*Kbps/g, "").trim()
  // Extract the part after the first hyphen
  const parts = cleanName.split("-")
  // Ensure extra spaces or unnecessary words are removed
  const artist = parts.length > 1 ? parts[1].replace(/\d+\s*Kbps/g, "").trim() : "Unknown Artist"
  return artist
}

async function getSongs(folder) {
  currFolder = folder
  const a = await fetch(`/${folder}/`)
  const response = await a.text()
  const div = document.createElement("div")
  div.innerHTML = response
  const as = div.getElementsByTagName("a")
  songs = []

  for (let index = 0; index < as.length; index++) {
    const element = as[index]
    if (element.href.endsWith(".mp3")) {
      songs.push(element.href.split(`/${folder}/`)[1])
    }
  }

  // Show all the songs in the playlist
  const songUL = document.querySelector(".songlist ul")
  songUL.innerHTML = ""

  for (const song of songs) {
    const decodedSong = decodeURIComponent(song.trim())
    const cleanTitle = extractSongName(decodedSong)
    const cleanArtist = extractArtistName(decodedSong)

    songUL.innerHTML += `<li> 
            <div class="song-info">
                <img class="invert" src="/img/music.svg" alt="Music Icon">
                <div class="details">
                    <div class="song-name">${cleanTitle}</div>
                    <div class="artist-name">${cleanArtist}</div>
                </div>
            </div>
            <button class="play-song" data-src="${song}">
                <img class="invert" src="/img/play.svg" alt="Play Icon">
            </button>
        </li>`
  }

  // Attach an event listener to each song
  document.querySelectorAll(".play-song").forEach((button) => {
    button.addEventListener("click", () => {
      const songFile = button.getAttribute("data-src")
      playMusic(songFile, button.querySelector("img"))
    })
  })
handleSearch();
  return songs
}

const playMusic = (track, clickedButton = null) => {
  const decodedTrack = decodeURIComponent(track.trim())
  const formattedTrack = decodedTrack.replaceAll(" ", "%20")

  // Check if the same song is playing and toggle pause/play
  if (currentSong.src.includes(formattedTrack) && !currentSong.paused) {
    currentSong.pause()
    if (clickedButton) clickedButton.src = "/img/play.svg"
    document.getElementById("play").src = "/img/play.svg"
    return
  }

  // Stop current song if playing
  if (!currentSong.paused || !currentSong.ended) {
    currentSong.pause()
    currentSong.currentTime = 0
  }

  // Set new song source and play
  setTimeout(() => {
    currentSong.src = `/${currFolder}/${formattedTrack}`

    const cleanTitle = extractSongName(decodedTrack)
    const cleanArtist = extractArtistName(decodedTrack)

    document.querySelector(".song-title").innerText = cleanTitle
    document.querySelector(".song-artist").innerText = cleanArtist

    // Reset all play buttons to play icon
    document.querySelectorAll(".play-song img").forEach((img) => (img.src = "/img/play.svg"))

    currentSong
      .play()
      .then(() => {
        if (clickedButton) clickedButton.src = "/img/pause.svg"
        document.getElementById("play").src = "/img/pause.svg"
      })
      .catch((error) => console.error("Error playing the song:", error))
  }, 100)
}

async function displayAlbums() {
  const response = await fetch('/songs/');
  const html = await response.text();
  const div = document.createElement("div");
  div.innerHTML = html;

  const anchors = div.getElementsByTagName("a");
  const cardContainer = document.querySelector(".cardContainer");
  cardContainer.innerHTML = '';

  for (let anchor of anchors) {
    if (anchor.href.includes('/songs/') && !anchor.href.includes('.htaccess')) {
      const folder = anchor.href.split('/').slice(-2)[0];
      try {
        const res = await fetch(`/songs/${folder}/info.json`);
        const info = await res.json();

        cardContainer.innerHTML += `
          <div class="card" data-folder="${folder}">
            <img src="/songs/${folder}/cover.jpg" alt="Album Cover">
            <h2>${info.title}</h2>
            <p>${info.description}</p>
            <button class="green-play-btn">
              <img src="/img/play.svg" alt="">
            </button>
          </div>`;
      } catch (e) {
        console.error("Error fetching info.json for", folder, e);
      }
    }
  }

  // Event listeners (Explicitly refresh playlist when clicked):
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', async () => {
      const folder = card.dataset.folder;
      await getSongs(`songs/${folder}`);
      handleSearch(); // Ensure filtering is applied after loading songs
      if (songs.length) playMusic(songs[0]);
    });

    const playBtn = card.querySelector('.green-play-btn');
    playBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const folder = card.dataset.folder;
      await getSongs(`songs/${folder}`);
      
      // CRUCIAL STEP: Reset search-bar to ensure all songs appear clearly
      document.getElementById('search-bar').value = '';
      handleSearch(); // <-- THIS ENSURES SONGS ARE VISIBLE IMMEDIATELY

      if (songs.length > 0) {
        playMusic(songs[0]);
      } else {
        console.error("No songs found for folder:", folder);
      }
    });
  });
}




function handleSearch() {
  const query = document.getElementById('search-bar').value.toLowerCase();

  // Filter album cards based on the query
  const cards = document.querySelectorAll('.cardContainer .card');
  cards.forEach(card => {
    const title = card.querySelector('h2').innerText.toLowerCase();
    const description = card.querySelector('p').innerText.toLowerCase();
    card.style.display = (title.includes(query) || description.includes(query)) ? 'block' : 'none';
  });

  // Filter displayed songs based on the query
  const songItems = document.querySelectorAll('.songlist ul li');
  songItems.forEach(item => {
    const songName = item.querySelector('.song-name').innerText.toLowerCase();
    const artistName = item.querySelector('.artist-name').innerText.toLowerCase();
    item.style.display = (songName.includes(query) || artistName.includes(query)) ? 'flex' : 'none';
  });
}




async function main() {
  // Display all the albums on the page
  await displayAlbums()

  // Set up event listeners for player controls
  const playButton = document.getElementById("play")
  const seekbar = document.querySelector(".seekbar")
  const currentTimeDisplay = document.querySelector(".current-time")
  const totalTimeDisplay = document.querySelector(".total-time")

  // Attach event listener to update seekbar
  currentSong.addEventListener("timeupdate", () => {
    const currentTime = currentSong.currentTime
    const duration = currentSong.duration

    if (!isNaN(duration)) {
      seekbar.value = (currentTime / duration) * 100 // Update seekbar position
      currentTimeDisplay.innerText = formatTime(currentTime)
      totalTimeDisplay.innerText = formatTime(duration)
    }
  })

  // Seekbar manual update
  seekbar.addEventListener("input", () => {
    const duration = currentSong.duration
    if (!isNaN(duration)) {
      currentSong.currentTime = (seekbar.value / 100) * duration
    }
  })

  // Play/Pause button
  playButton.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play()
      playButton.src = "/img/pause.svg"

      document.querySelectorAll(".play-song img").forEach((img) => {
        const parentButton = img.closest(".play-song")
        if (parentButton && parentButton.getAttribute("data-src") === currentSong.src.split(`/${currFolder}/`)[1]) {
          img.src = "/img/pause.svg"
        }
      })
    } else {
      currentSong.pause()
      playButton.src = "/img/play.svg"
      document.querySelectorAll(".play-song img").forEach((img) => (img.src = "/img/play.svg"))
    }
  })

  // Previous button
  document.querySelector("#previous").addEventListener("click", () => {
    if (!currFolder || songs.length === 0) return

    const currentTrack = currentSong.src.split(`/${currFolder}/`)[1]
    const index = songs.indexOf(currentTrack)
    if (index !== -1) {
      playMusic(songs[index > 0 ? index - 1 : songs.length - 1])
    } else if (songs.length > 0) {
      playMusic(songs[0])
    }
  })

  // Next button
  document.querySelector("#next").addEventListener("click", () => {
    if (!currFolder || songs.length === 0) return

    const currentTrack = currentSong.src.split(`/${currFolder}/`)[1]
    const index = songs.indexOf(currentTrack)
    if (index !== -1) {
      playMusic(songs[index < songs.length - 1 ? index + 1 : 0])
    } else if (songs.length > 0) {
      playMusic(songs[0])
    }
  })

  // Volume controls
  const volumeSeekbar = document.querySelector(".volume-seekbar")
  const volumeButton = document.querySelector(".volume-button")

  volumeSeekbar.addEventListener("input", () => {
    currentSong.volume = volumeSeekbar.value / 100

    // Update volume icon based on volume level
    if (currentSong.volume === 0) {
      volumeButton.src = "/img/mute.svg"
    } else {
      volumeButton.src = "/img/volume.svg"
    }
  })

  let isMuted = false
  volumeButton.addEventListener("click", () => {
    isMuted = !isMuted
    currentSong.volume = isMuted ? 0 : volumeSeekbar.value / 100
    volumeButton.src = isMuted ? "/img/mute.svg" : "/img/volume.svg"
  })

  // Hamburger menu
  const hamburger = document.querySelector(".hamburger")
  const sidebar = document.querySelector(".left")
  const closeButton = document.querySelector(".cross")

  hamburger.addEventListener("click", () => {
    sidebar.style.left = "0px"
    sidebar.classList.toggle("open")
  })

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      sidebar.style.left = "-120%"
      sidebar.classList.remove("open")
    })
  }
 // 👇 Add Search Functionality here (at the bottom of main)
 document.getElementById('search-btn').addEventListener('click', () => {
  const query = document.getElementById('search-bar').value.toLowerCase();
  const songItems = document.querySelectorAll('.songlist ul li');

  songItems.forEach((item) => {
    const songName = item.querySelector('.song-name').innerText.toLowerCase();
    const artistName = item.querySelector('.artist-name').innerText.toLowerCase();

    if (songName.includes(query) || artistName.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
});

// Allow search on Enter key press
document.getElementById('search-btn').addEventListener('click', handleSearch);
document.getElementById('search-bar').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});}

// Initialize the application
main()

