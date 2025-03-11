const currentSong = new Audio();
let songs;
let currFolder;

// Format time function (MM:SS)
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

/**
 * Remove file extension (.mp3) and ANY mention of '128 Kbps' or '320 Kbps'.
 * If there's a hyphen, it removes '- 128 Kbps'; also removes ' 128 Kbps' if no hyphen.
 * Finally, we split on the first hyphen to isolate the earliest part as the displayed name.
 */
function extractSongName(filename) {
  let nameWithoutExtension = filename.replace(".mp3", "");
  // First remove patterns like "- 128 Kbps" or "- 320 Kbps"
  nameWithoutExtension = nameWithoutExtension.replace(/-\s*\d+\s*Kbps/g, "");
  // Then remove if there's no hyphen, e.g. " 128 Kbps"
  nameWithoutExtension = nameWithoutExtension.replace(/\s*\d+\s*Kbps/g, "");
  
  // Trim extra spaces, then split on first hyphen
  const cleanName = nameWithoutExtension.trim().split("-")[0].trim();
  return cleanName;
}

// Same approach for the artist name
function extractArtistName(filename) {
  let nameWithoutExtension = filename.replace(".mp3", "");
  nameWithoutExtension = nameWithoutExtension.replace(/-\s*\d+\s*Kbps/g, "");
  nameWithoutExtension = nameWithoutExtension.replace(/\s*\d+\s*Kbps/g, "");
  
  // Then see if there's a second portion after a hyphen
  const parts = nameWithoutExtension.trim().split("-");
  return parts.length > 1 ? parts[1].trim() : "Unknown Artist";
}

// ──────────────────────────────────────────
//  getSongs(folder) loads songs.json
// ──────────────────────────────────────────
async function getSongs(folder) {
  currFolder = folder;
  songs = [];

  // Fetch that folder's songs.json
  try {
    const response = await fetch(`/${folder}/songs.json`);
    songs = await response.json();
  } catch (error) {
    console.error(`Error fetching songs.json in folder ${folder}`, error);
    return songs; // empty if error
  }

  // Show all songs in the playlist
  const songUL = document.querySelector(".songlist ul");
  songUL.innerHTML = "";

  for (const song of songs) {
    const decodedSong = decodeURIComponent(song.trim());
    const cleanTitle = extractSongName(decodedSong);
    const cleanArtist = extractArtistName(decodedSong);

    songUL.innerHTML += `
      <li>
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
      </li>`;
  }

  document.querySelectorAll(".play-song").forEach((button) => {
    button.addEventListener("click", () => {
      const songFile = button.getAttribute("data-src");
      playMusic(songFile, button.querySelector("img"));
    });
  });

  handleSearch();
  return songs;
}

// ──────────────────────────────────────────
//  Play / Pause logic
// ──────────────────────────────────────────
function playMusic(track, clickedButton = null) {
  const decodedTrack = decodeURIComponent(track.trim());
  const formattedTrack = decodedTrack.replaceAll(" ", "%20");

  // If it's the same song and it's playing, pause
  if (currentSong.src.includes(formattedTrack) && !currentSong.paused) {
    currentSong.pause();
    if (clickedButton) clickedButton.src = "/img/play.svg";
    document.getElementById("play").src = "/img/play.svg";
    return;
  }

  // Stop current if playing
  if (!currentSong.paused || !currentSong.ended) {
    currentSong.pause();
    currentSong.currentTime = 0;
  }

  // Set new source and play
  setTimeout(() => {
    currentSong.src = `/${currFolder}/${formattedTrack}`;

    const cleanTitle = extractSongName(decodedTrack);
    const cleanArtist = extractArtistName(decodedTrack);

    document.querySelector(".song-title").innerText = cleanTitle;
    document.querySelector(".song-artist").innerText = cleanArtist;

    // Reset all small play icons
    document.querySelectorAll(".play-song img").forEach((img) => (img.src = "/img/play.svg"));

    currentSong
      .play()
      .then(() => {
        if (clickedButton) clickedButton.src = "/img/pause.svg";
        document.getElementById("play").src = "/img/pause.svg";
      })
      .catch((error) => console.error("Error playing the song:", error));
  }, 100);
}

// ──────────────────────────────────────────
//  HARD-CODED ALBUMS (folder names)
// ──────────────────────────────────────────
async function displayAlbums() {
  // Replace with the actual names of your folders under /songs/
  const albumFolders = [
    "Anuv",
    "Arijit Singh",
    "Atif Aslam",
    "Shankar-Ehsan",
    "Shreya Goshal",
    "Vishal-Shekhar"
  ];

  const cardContainer = document.querySelector(".cardContainer");
  cardContainer.innerHTML = "";

  for (const folder of albumFolders) {
    try {
      // Fetch info.json for each folder
      const res = await fetch(`/songs/${folder}/info.json`);
      const info = await res.json();

      // Add a card to the UI
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

  // Add event listeners to each album card
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", async () => {
      const folder = card.dataset.folder;
      // getSongs expects something like "songs/Anuv"
      await getSongs(`songs/${folder}`);

      // Clear search box and re-run search
      document.getElementById("search-bar").value = "";
      handleSearch();

      // Auto-play the first song if it exists
      if (songs.length) playMusic(songs[0]);
    });

    const playBtn = card.querySelector(".green-play-btn");
    playBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const folder = card.dataset.folder;
      await getSongs(`songs/${folder}`);

      document.getElementById("search-bar").value = "";
      handleSearch();

      if (songs.length > 0) {
        playMusic(songs[0]);
      } else {
        console.error("No songs found for folder:", folder);
      }
    });
  });
}

// ──────────────────────────────────────────
//  Searching for albums & songs
// ──────────────────────────────────────────
function handleSearch() {
  const query = document.getElementById("search-bar").value.toLowerCase();

  // Filter album cards
  const cards = document.querySelectorAll(".cardContainer .card");
  cards.forEach((card) => {
    const title = card.querySelector("h2").innerText.toLowerCase();
    const description = card.querySelector("p").innerText.toLowerCase();
    card.style.display =
      title.includes(query) || description.includes(query) ? "block" : "none";
  });

  // Filter songs in the current playlist
  const songItems = document.querySelectorAll(".songlist ul li");
  songItems.forEach((item) => {
    const songName = item.querySelector(".song-name").innerText.toLowerCase();
    const artistName = item.querySelector(".artist-name").innerText.toLowerCase();
    item.style.display =
      songName.includes(query) || artistName.includes(query) ? "flex" : "none";
  });
}

// ──────────────────────────────────────────
//  Main initialization
// ──────────────────────────────────────────
async function main() {
  await displayAlbums();

  // Player controls
  const playButton = document.getElementById("play");
  const seekbar = document.querySelector(".seekbar");
  const currentTimeDisplay = document.querySelector(".current-time");
  const totalTimeDisplay = document.querySelector(".total-time");

  // Keep the player time/seekbar in sync
  currentSong.addEventListener("timeupdate", () => {
    const currentTime = currentSong.currentTime;
    const duration = currentSong.duration;
    if (!isNaN(duration)) {
      seekbar.value = (currentTime / duration) * 100;
      currentTimeDisplay.innerText = formatTime(currentTime);
      totalTimeDisplay.innerText = formatTime(duration);
    }
  });

  // Seekbar manual scrub
  seekbar.addEventListener("input", () => {
    const duration = currentSong.duration;
    if (!isNaN(duration)) {
      currentSong.currentTime = (seekbar.value / 100) * duration;
    }
  });

  // Play/Pause main button
  playButton.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play();
      playButton.src = "/img/pause.svg";

      // Sync small buttons if same track
      document.querySelectorAll(".play-song img").forEach((img) => {
        const parentButton = img.closest(".play-song");
        // decodeURIComponent for matching
        if (
          parentButton &&
          parentButton.getAttribute("data-src") ===
            decodeURIComponent(currentSong.src.split(`/${currFolder}/`)[1])
        ) {
          img.src = "/img/pause.svg";
        }
      });
    } else {
      currentSong.pause();
      playButton.src = "/img/play.svg";
      document.querySelectorAll(".play-song img").forEach((img) => (img.src = "/img/play.svg"));
    }
  });

  // Previous with decode
  document.querySelector("#previous").addEventListener("click", () => {
    if (!currFolder || !songs || songs.length === 0) return;
    const splittedTrack = currentSong.src.split(`/${currFolder}/`)[1];
    const currentTrack = decodeURIComponent(splittedTrack);
    const index = songs.indexOf(currentTrack);
    if (index !== -1) {
      playMusic(songs[index > 0 ? index - 1 : songs.length - 1]);
    } else if (songs.length > 0) {
      playMusic(songs[0]);
    }
  });

  // Next with decode
  document.querySelector("#next").addEventListener("click", () => {
    if (!currFolder || !songs || songs.length === 0) return;
    const splittedTrack = currentSong.src.split(`/${currFolder}/`)[1];
    const currentTrack = decodeURIComponent(splittedTrack);
    const index = songs.indexOf(currentTrack);
    if (index !== -1) {
      playMusic(songs[index < songs.length - 1 ? index + 1 : 0]);
    } else if (songs.length > 0) {
      playMusic(songs[0]);
    }
  });

  // Volume controls
  const volumeSeekbar = document.querySelector(".volume-seekbar");
  const volumeButton = document.querySelector(".volume-button");
  let isMuted = false;

  volumeSeekbar.addEventListener("input", () => {
    currentSong.volume = volumeSeekbar.value / 100;
    volumeButton.src = currentSong.volume === 0 ? "/img/mute.svg" : "/img/volume.svg";
  });

  volumeButton.addEventListener("click", () => {
    isMuted = !isMuted;
    currentSong.volume = isMuted ? 0 : volumeSeekbar.value / 100;
    volumeButton.src = isMuted ? "/img/mute.svg" : "/img/volume.svg";
  });

  // Hamburger menu
  const hamburger = document.querySelector(".hamburger");
  const sidebar = document.querySelector(".left");
  const closeButton = document.querySelector(".cross");

  hamburger.addEventListener("click", () => {
    sidebar.style.left = "0px";
    sidebar.classList.toggle("open");
  });

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      sidebar.style.left = "-120%";
      sidebar.classList.remove("open");
    });
  }

  // Search
  document.getElementById("search-btn").addEventListener("click", handleSearch);
  document.getElementById("search-bar").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });
}

// Finally, initialize everything
main();
