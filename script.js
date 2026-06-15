/**
 * MemeInstants - Core Application Logic
 * Implements Web Audio API, IndexedDB storage, recording, visualizers, and favorites.
 */

// -----------------------------------------------------------------
// 1. Initial Default Sound List (Verified MyInstants MP3 Links)
// -----------------------------------------------------------------
const DEFAULT_SOUNDS = [
    {
        id: "vine-boom",
        name: "VINE BOOM",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/vine-boom.mp3",
        color: "red"
    },
    {
        id: "rizz-sound",
        name: "Rizz Sound Effect",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/rizz-sound-effect.mp3",
        color: "purple"
    },
    {
        id: "sad-violin",
        name: "Sad Violin (Meme)",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/tf_nemesis.mp3",
        color: "blue"
    },
    {
        id: "dry-fart",
        name: "Dry Fart",
        category: "reactions",
        url: "https://www.myinstants.com/media/sounds/dry-fart.mp3",
        color: "orange"
    },
    {
        id: "anime-wow",
        name: "Anime Wow",
        category: "anime",
        url: "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3",
        color: "purple"
    },
    {
        id: "among-us-reveal",
        name: "Among Us Role Reveal",
        category: "gaming",
        url: "https://www.myinstants.com/media/sounds/among-us-role-reveal-sound.mp3",
        color: "red"
    },
    {
        id: "dun-dun-dun",
        name: "Dun Dun Dunnn",
        category: "reactions",
        url: "https://www.myinstants.com/media/sounds/dun-dun-dun-sound-effect-brass_8nFBccR.mp3",
        color: "yellow"
    },
    {
        id: "punch-sfx",
        name: "Punch Sound Effect",
        category: "gaming",
        url: "https://www.myinstants.com/media/sounds/punch-gaming-sound-effect-hd_RzlG1GE.mp3",
        color: "green"
    },
    {
        id: "bone-crack",
        name: "Bone Crack",
        category: "sfx",
        url: "https://www.myinstants.com/media/sounds/bone-crack.mp3",
        color: "orange"
    },
    {
        id: "aayein-meme",
        name: "Aayein (Meme)",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/aayein-meme.mp3",
        color: "yellow"
    },
    {
        id: "fahhhhh",
        name: "FAHHHHHHHHHHHHHH",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/fahhhhhhhhhhhhhh.mp3",
        color: "red"
    },
    {
        id: "faaah",
        name: "FAAAH",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/faaah.mp3",
        color: "orange"
    },
    {
        id: "are-baap-re",
        name: "Are Baap Re Yaad Aya",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/are-baap-re-yaad-aya.mp3",
        color: "green"
    },
    {
        id: "chicken-screaming",
        name: "Chicken Screaming",
        category: "sfx",
        url: "https://www.myinstants.com/media/sounds/chicken-on-tree-screaming.mp3",
        color: "red"
    },
    {
        id: "haha-funny",
        name: "Haha Funny Laugh",
        category: "reactions",
        url: "https://www.myinstants.com/media/sounds/ny-video-online-audio-converter.mp3",
        color: "blue"
    },
    {
        id: "matlab-wo-level",
        name: "Matlab Alag Level",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/matlab-wo-alag-hi-level-ka-banda-tha.mp3",
        color: "purple"
    },
    {
        id: "gopgopgop",
        name: "Gop Gop Gop",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/gopgopgop.mp3",
        color: "yellow"
    },
    {
        id: "anime-ahh",
        name: "Anime Ahh",
        category: "anime",
        url: "https://www.myinstants.com/media/sounds/anime-ahh.mp3",
        color: "orange"
    },
    {
        id: "instagram-thud",
        name: "Instagram Thud",
        category: "memes",
        url: "https://www.myinstants.com/media/sounds/vine-boom-sound-effect_KT89XIq.mp3",
        color: "blue"
    },
    {
        id: "tum-dum-tedau",
        name: "Tum Dum Tedau",
        category: "sfx",
        url: "https://www.myinstants.com/media/sounds/tum-dum-tedau.mp3",
        color: "green"
    }
];

// -----------------------------------------------------------------
// 2. Global State Variables
// -----------------------------------------------------------------
let sounds = [...DEFAULT_SOUNDS];
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let db = null; // IndexedDB instance

// Audio Context & Audio State
let audioCtx = null;
const decodedAudioBufferCache = new Map(); // Cache for loaded AudioBuffers: id -> AudioBuffer
const activeAudioSources = new Set(); // Currently playing nodes: { sourceNode, gainNode, soundId }
let globalVolume = parseFloat(localStorage.getItem("globalVolume") || "0.8");
let globalSpeed = parseFloat(localStorage.getItem("globalSpeed") || "1.0");
let globalPitch = parseInt(localStorage.getItem("globalPitch") || "0"); // Semitones (-12 to +12)
let globalLoop = false;
let currentlyPlayingSound = null; // Meta info of active sound: { id, name, category }

// Media Recorder State
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = 0;
let recordingTimerInterval = null;
let currentRecordedAudioBlob = null;

// Visualizer State
let detailAnalyser = null;
let detailVisualizerAnimId = null;

// UI State
let currentCategory = "all";
let searchQuery = "";
let uploadMode = "upload"; // 'upload' or 'record'

// -----------------------------------------------------------------
// 3. Database Initialization (IndexedDB for custom offline audio)
// -----------------------------------------------------------------
const DB_NAME = "MemeInstantsDB";
const DB_VERSION = 1;
const STORE_NAME = "sounds";

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        
        request.onerror = (e) => {
            console.error("IndexedDB Open Error:", e.target.error);
            reject(e.target.error);
        };
    });
}

function loadCustomSounds() {
    return new Promise((resolve) => {
        if (!db) return resolve([]);
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            resolve([]);
        };
    });
}

function saveCustomSoundToDB(soundObj) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized");
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(soundObj);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function deleteCustomSoundFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized");
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// -----------------------------------------------------------------
// 4. Web Audio Engine & Low Latency Playback
// -----------------------------------------------------------------
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Fetch and Cache/Decode sound
async function getAudioBuffer(sound) {
    if (decodedAudioBufferCache.has(sound.id)) {
        return decodedAudioBufferCache.get(sound.id);
    }
    
    let arrayBuffer;
    
    if (sound.isCustom) {
        // Load custom sound arrayBuffer from the database
        arrayBuffer = sound.audioData;
    } else {
        // Fetch remote sound via our CORS bypass proxy
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(sound.url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Network audio fetch failed");
        arrayBuffer = await response.arrayBuffer();
    }
    
    initAudio();
    // Decode audio data
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    decodedAudioBufferCache.set(sound.id, audioBuffer);
    return audioBuffer;
}

// Play sound
async function playSound(soundId, options = {}) {
    initAudio();
    
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;
    
    // Add compression visuals to DOM
    const cap = document.querySelector(`[data-sound-cap-id="${soundId}"]`);
    if (cap) {
        cap.classList.add("is-playing");
    }
    
    try {
        const buffer = await getAudioBuffer(sound);
        
        // Setup Nodes
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = audioCtx.createGain();
        
        // Route audio: Source -> Gain -> Destination
        // If details visualizer is active, connect via AnalyserNode
        if (options.useAnalyser && detailAnalyser) {
            source.connect(detailAnalyser);
            detailAnalyser.connect(gainNode);
        } else {
            source.connect(gainNode);
        }
        
        gainNode.connect(audioCtx.destination);
        
        // Apply Modifiers
        const vol = options.volume !== undefined ? options.volume : globalVolume;
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        
        const speed = options.speed !== undefined ? options.speed : globalSpeed;
        source.playbackRate.value = speed;
        
        // Pitch shift via detune (100 cents = 1 semitone)
        const pitch = options.pitch !== undefined ? options.pitch : globalPitch;
        source.detune.value = pitch * 100;
        
        source.loop = options.loop !== undefined ? options.loop : globalLoop;
        
        // Save current playing reference
        const playRecord = { sourceNode: source, gainNode: gainNode, soundId: soundId };
        activeAudioSources.add(playRecord);
        
        // Trigger start
        source.start(0);
        
        // Set playing states in player bar
        updateGlobalPlayerBar(sound);
        
        source.onended = () => {
            activeAudioSources.delete(playRecord);
            if (cap) {
                // Check if any other instances are still playing before removing styling
                const stillPlaying = Array.from(activeAudioSources).some(src => src.soundId === soundId);
                if (!stillPlaying) {
                    cap.classList.remove("is-playing");
                }
            }
            // If all sounds stopped, hide global player bar (unless looped)
            if (activeAudioSources.size === 0 && !globalLoop) {
                // We keep the player bar showing last played sound, but stop animations
                stopGlobalPlayerAnimations();
            }
        };
        
        return playRecord;
        
    } catch (error) {
        console.error("Audio Playback Error:", error);
        showToast("Error loading or decoding sound!");
        if (cap) cap.classList.remove("is-playing");
    }
}

// Stop all sounds
function stopAllSounds() {
    activeAudioSources.forEach(record => {
        try {
            record.sourceNode.stop();
        } catch(e) {}
    });
    activeAudioSources.clear();
    
    // Clear active play classes
    document.querySelectorAll(".button-3d-cap").forEach(cap => {
        cap.classList.remove("is-playing");
    });
    
    stopGlobalPlayerAnimations();
}

// Stop specific sound
function stopSound(soundId) {
    activeAudioSources.forEach(record => {
        if (record.soundId === soundId) {
            try {
                record.sourceNode.stop();
            } catch(e) {}
            activeAudioSources.delete(record);
        }
    });
    
    const cap = document.querySelector(`[data-sound-cap-id="${soundId}"]`);
    if (cap) cap.classList.remove("is-playing");
}

// Dynamically update volumes of currently playing sounds
function updateActiveVolumes(vol) {
    activeAudioSources.forEach(record => {
        record.gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    });
}

// Dynamically update speed/pitch of active sounds
function updateActivePlaybackModifiers(speed, pitch) {
    activeAudioSources.forEach(record => {
        record.sourceNode.playbackRate.value = speed;
        record.sourceNode.detune.value = pitch * 100;
    });
}

// -----------------------------------------------------------------
// 5. DOM Rendering and Grid Creation
// -----------------------------------------------------------------
const soundGrid = document.getElementById("sound-grid");
const emptyState = document.getElementById("empty-state");

function renderSoundGrid() {
    soundGrid.innerHTML = "";
    
    // Filter sounds
    const filteredSounds = sounds.filter(sound => {
        const matchesCategory = currentCategory === "all" || 
                                (currentCategory === "favorites" && favorites.includes(sound.id)) ||
                                (currentCategory === "custom" && sound.isCustom) ||
                                sound.category === currentCategory;
                                
        const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesCategory && matchesSearch;
    });
    
    if (filteredSounds.length === 0) {
        emptyState.classList.remove("hidden");
        soundGrid.classList.add("hidden");
        return;
    }
    
    emptyState.classList.add("hidden");
    soundGrid.classList.remove("hidden");
    
    filteredSounds.forEach(sound => {
        const isFavorited = favorites.includes(sound.id);
        const card = document.createElement("div");
        card.className = `sound-card btn-theme-${sound.color}`;
        card.id = `card-${sound.id}`;
        
        card.innerHTML = `
            <div class="button-3d-container">
                <div class="button-3d-base">
                    <button class="button-3d-cap" data-sound-cap-id="${sound.id}" title="Play ${sound.name}" aria-label="Play ${sound.name}"></button>
                </div>
            </div>
            <a href="?sound=${sound.id}" class="sound-title-link" title="${sound.name}">${sound.name}</a>
            <div class="sound-card-actions">
                <button class="card-action-btn favorite-btn ${isFavorited ? 'favorited' : ''}" data-sound-fav-id="${sound.id}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                </button>
                <button class="card-action-btn share-btn" data-sound-share-id="${sound.id}" title="Share Link" aria-label="Share">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
                    </svg>
                </button>
                <button class="card-action-btn details-btn" data-sound-details-id="${sound.id}" title="View Details" aria-label="Details">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Attach Event Listeners
        const capBtn = card.querySelector(".button-3d-cap");
        capBtn.addEventListener("click", () => {
            playSound(sound.id);
        });
        
        const titleLink = card.querySelector(".sound-title-link");
        titleLink.addEventListener("click", (e) => {
            e.preventDefault();
            openDetailsModal(sound.id);
        });
        
        const favBtn = card.querySelector(".favorite-btn");
        favBtn.addEventListener("click", () => {
            toggleFavorite(sound.id, favBtn);
        });
        
        const shareBtn = card.querySelector(".share-btn");
        shareBtn.addEventListener("click", () => {
            shareSoundLink(sound.id);
        });
        
        const detailsBtn = card.querySelector(".details-btn");
        detailsBtn.addEventListener("click", () => {
            openDetailsModal(sound.id);
        });
        
        soundGrid.appendChild(card);
    });
}

// -----------------------------------------------------------------
// 6. Global Player Bar updates & Controls UI
// -----------------------------------------------------------------
const playerBar = document.getElementById("global-player-bar");
const playerTitle = document.getElementById("player-title");
const playerCategory = document.getElementById("player-category");
const volSlider = document.getElementById("global-volume");
const valVolume = document.getElementById("val-volume");
const speedSlider = document.getElementById("global-speed");
const valSpeed = document.getElementById("val-speed");
const pitchSlider = document.getElementById("global-pitch");
const valPitch = document.getElementById("val-pitch");
const loopBtn = document.getElementById("player-loop-btn");
const stopBtn = document.getElementById("player-stop-btn");
const downloadBtn = document.getElementById("player-download-btn");

function updateGlobalPlayerBar(sound) {
    currentlyPlayingSound = sound;
    playerTitle.textContent = sound.name;
    playerCategory.textContent = sound.category;
    
    playerBar.classList.remove("hidden");
    
    // Add wave animation classes
    document.querySelectorAll(".playing-indicator .bar").forEach(bar => {
        bar.style.animationPlayState = "running";
    });
}

function stopGlobalPlayerAnimations() {
    document.querySelectorAll(".playing-indicator .bar").forEach(bar => {
        bar.style.animationPlayState = "paused";
    });
}

// Volume Slider Event
volSlider.addEventListener("input", (e) => {
    globalVolume = parseFloat(e.target.value);
    valVolume.textContent = Math.round(globalVolume * 100) + "%";
    localStorage.setItem("globalVolume", globalVolume);
    updateActiveVolumes(globalVolume);
});

// Speed Slider Event
speedSlider.addEventListener("input", (e) => {
    globalSpeed = parseFloat(e.target.value);
    valSpeed.textContent = globalSpeed.toFixed(1) + "x";
    localStorage.setItem("globalSpeed", globalSpeed);
    updateActivePlaybackModifiers(globalSpeed, globalPitch);
});

// Pitch Slider Event
pitchSlider.addEventListener("input", (e) => {
    globalPitch = parseInt(e.target.value);
    valPitch.textContent = (globalPitch > 0 ? "+" : "") + globalPitch;
    localStorage.setItem("globalPitch", globalPitch);
    updateActivePlaybackModifiers(globalSpeed, globalPitch);
});

// Loop Button Click
loopBtn.addEventListener("click", () => {
    globalLoop = !globalLoop;
    loopBtn.classList.toggle("active", globalLoop);
    // Apply loop directly to all active nodes
    activeAudioSources.forEach(record => {
        record.sourceNode.loop = globalLoop;
    });
});

// Stop Button Click
stopBtn.addEventListener("click", () => {
    stopAllSounds();
});

// Download Audio Button Click
downloadBtn.addEventListener("click", () => {
    if (currentlyPlayingSound) {
        downloadSoundAudio(currentlyPlayingSound);
    }
});

async function downloadSoundAudio(sound) {
    try {
        if (sound.isCustom) {
            // Save from db
            const blob = new Blob([sound.audioData], { type: "audio/mp3" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${sound.name.replace(/\s+/g, "_").toLowerCase()}.mp3`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // Fetch and save remote file via proxy to bypass CORS
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(sound.url)}`;
            const res = await fetch(proxyUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${sound.name.replace(/\s+/g, "_").toLowerCase()}.mp3`;
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch(err) {
        console.error("Download failed:", err);
        showToast("Download failed, try again!");
    }
}

// Initialize sliders visual values
valVolume.textContent = Math.round(globalVolume * 100) + "%";
volSlider.value = globalVolume;
valSpeed.textContent = globalSpeed.toFixed(1) + "x";
speedSlider.value = globalSpeed;
valPitch.textContent = (globalPitch > 0 ? "+" : "") + globalPitch;
pitchSlider.value = globalPitch;

// -----------------------------------------------------------------
// 7. Favorites and Sharing Utilities
// -----------------------------------------------------------------
function toggleFavorite(soundId, btnElement = null) {
    const idx = favorites.indexOf(soundId);
    let isFavNow = false;
    
    if (idx === -1) {
        favorites.push(soundId);
        isFavNow = true;
        showToast("Added to Favorites! ⭐");
    } else {
        favorites.splice(idx, 1);
        showToast("Removed from Favorites.");
    }
    
    localStorage.setItem("favorites", JSON.stringify(favorites));
    
    // Update active button classes in grid
    if (btnElement) {
        btnElement.classList.toggle("favorited", isFavNow);
        btnElement.title = isFavNow ? "Remove from favorites" : "Add to favorites";
    } else {
        // Re-render grid to make it match or update specific elements
        renderSoundGrid();
    }
    
    // If we are currently in favorites tab, re-render to filter out removed elements
    if (currentCategory === "favorites") {
        renderSoundGrid();
    }
}

function shareSoundLink(soundId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?sound=${soundId}`;
    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            showToast("Direct link copied to clipboard! 🔗");
        })
        .catch(() => {
            showToast("Failed to copy link. Try manually sharing.");
        });
}

// Toast notification helper
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
let toastTimeout = null;

function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMsg.textContent = message;
    toast.classList.remove("hidden");
    // Force reflow
    toast.offsetHeight;
    toast.classList.add("show");
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.classList.add("hidden"), 300);
    }, 2500);
}

// -----------------------------------------------------------------
// 8. Modal: Sound Details & Waveform Visualizer
// -----------------------------------------------------------------
const modalDetails = document.getElementById("modal-details");
const detailTitle = document.getElementById("detail-title");
const detailCategory = document.getElementById("detail-category");
const detailFavsCount = document.getElementById("detail-favorites-count");
const detailLinkInput = document.getElementById("detail-link-input");
const btnCopyLink = document.getElementById("btn-copy-link");
const detailBigButton = document.getElementById("detail-big-button");
const btnModalFavorite = document.getElementById("btn-modal-favorite");
const txtModalFavorite = document.getElementById("txt-modal-favorite");
const btnModalDownload = document.getElementById("btn-modal-download");
const btnCloseDetails = document.getElementById("btn-close-details");
const detailVisualizer = document.getElementById("detail-visualizer");
const detailCtx = detailVisualizer.getContext("2d");

let detailActiveSoundId = null;

function openDetailsModal(soundId) {
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;
    
    detailActiveSoundId = soundId;
    detailTitle.textContent = sound.name;
    detailCategory.className = `info-value category-tag btn-theme-${sound.color}`;
    detailCategory.textContent = sound.category;
    
    // Set direct link
    const shareUrl = `${window.location.origin}${window.location.pathname}?sound=${soundId}`;
    detailLinkInput.value = shareUrl;
    
    // Apply styling to central big button
    detailBigButton.className = "detail-play-button";
    detailBigButton.style.background = `radial-gradient(circle at 35% 35%, var(--btn-cap), var(--btn-primary))`;
    detailBigButton.style.borderColor = `#1a1a1a`;
    detailBigButton.style.setProperty("--btn-cap", `var(--btn-theme-${sound.color}-cap, #ff453a)`);
    
    // Dynamically apply classes to match custom palette
    const colorClasses = ["red", "blue", "green", "purple", "yellow", "orange"];
    colorClasses.forEach(c => modalDetails.classList.remove(`btn-theme-${c}`));
    modalDetails.classList.add(`btn-theme-${sound.color}`);
    
    // Setup Favorites toggle
    updateModalFavoriteBtnState(soundId);
    
    // Setup audio visualization
    setupDetailVisualizer();
    
    // Display Modal
    modalDetails.classList.remove("hidden");
    
    // URL state tracking (without hard reload)
    window.history.pushState(null, "", `?sound=${soundId}`);
}

function updateModalFavoriteBtnState(soundId) {
    const isFav = favorites.includes(soundId);
    btnModalFavorite.classList.toggle("favorited", isFav);
    txtModalFavorite.textContent = isFav ? "Favorited" : "Favorite";
    detailFavsCount.textContent = isFav ? "⭐ Favorited by you" : "Not favorited yet";
}

function closeDetailsModal() {
    modalDetails.classList.add("hidden");
    detailActiveSoundId = null;
    
    // Stop visualizer animation
    if (detailVisualizerAnimId) {
        cancelAnimationFrame(detailVisualizerAnimId);
        detailVisualizerAnimId = null;
    }
    
    // Stop detail-specific sounds
    stopAllSounds();
    
    // Clear URL parameters
    window.history.pushState(null, "", window.location.pathname);
}

// Setup Visualizer Node
function setupDetailVisualizer() {
    initAudio();
    if (!detailAnalyser) {
        detailAnalyser = audioCtx.createAnalyser();
        detailAnalyser.fftSize = 64; // Small size for simple clean bars
    }
    
    const bufferLength = detailAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        detailVisualizerAnimId = requestAnimationFrame(draw);
        
        detailAnalyser.getByteFrequencyData(dataArray);
        
        detailCtx.fillStyle = 'rgba(18, 20, 32, 0.4)';
        detailCtx.fillRect(0, 0, detailVisualizer.width, detailVisualizer.height);
        
        const barWidth = (detailVisualizer.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;
        
        // Grab current theme color for bars
        const activeSound = sounds.find(s => s.id === detailActiveSoundId);
        let barColor = "#ff3b30";
        if (activeSound) {
            const colors = {
                red: "#ff3b30",
                blue: "#007aff",
                green: "#34c759",
                purple: "#af52de",
                yellow: "#ffcc00",
                orange: "#ff9500"
            };
            barColor = colors[activeSound.color] || barColor;
        }
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2.5; // Scale height
            
            // Draw dual reflective waveform bars
            detailCtx.fillStyle = barColor;
            detailCtx.fillRect(x, detailVisualizer.height / 2 - barHeight / 2, barWidth - 2, barHeight);
            
            x += barWidth;
        }
    }
    
    if (detailVisualizerAnimId) cancelAnimationFrame(detailVisualizerAnimId);
    draw();
}

// Modal Detail Bindings
btnCloseDetails.addEventListener("click", closeDetailsModal);

btnCopyLink.addEventListener("click", () => {
    detailLinkInput.select();
    navigator.clipboard.writeText(detailLinkInput.value)
        .then(() => showToast("Direct link copied! 🔗"))
        .catch(() => showToast("Copy failed!"));
});

detailBigButton.addEventListener("click", () => {
    if (detailActiveSoundId) {
        playSound(detailActiveSoundId, { useAnalyser: true });
    }
});

btnModalFavorite.addEventListener("click", () => {
    if (detailActiveSoundId) {
        toggleFavorite(detailActiveSoundId);
        updateModalFavoriteBtnState(detailActiveSoundId);
    }
});

btnModalDownload.addEventListener("click", () => {
    if (detailActiveSoundId) {
        const sound = sounds.find(s => s.id === detailActiveSoundId);
        if (sound) downloadSoundAudio(sound);
    }
});

// Close modal if clicking background
modalDetails.addEventListener("click", (e) => {
    if (e.target === modalDetails) closeDetailsModal();
});

// -----------------------------------------------------------------
// 9. Modal: Create & Upload Sound (MediaRecorder & Audio Blobs)
// -----------------------------------------------------------------
const modalCreate = document.getElementById("modal-create");
const btnAddSound = document.getElementById("btn-add-sound");
const btnCloseCreate = document.getElementById("btn-close-create");
const btnCancelCreate = document.getElementById("btn-cancel-create");

const tabUpload = document.getElementById("tab-upload");
const tabRecord = document.getElementById("tab-record");
const sectionUpload = document.getElementById("section-upload");
const sectionRecord = document.getElementById("section-record");

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileInfoContainer = document.getElementById("file-info-container");
const fileNameText = document.getElementById("file-name-text");
const btnClearFile = document.getElementById("btn-clear-file");

const btnRecordAction = document.getElementById("btn-record-action");
const recordTimer = document.getElementById("record-timer");
const recordStatus = document.getElementById("record-status");
const micVisualizer = document.getElementById("mic-visualizer-container");

const audioPreviewContainer = document.getElementById("audio-preview-container");
const btnPreviewPlay = document.getElementById("btn-preview-play");

const soundNameInput = document.getElementById("sound-name");
const soundCategorySelect = document.getElementById("sound-category");
const btnSubmitSound = document.getElementById("btn-submit-sound");
const createForm = document.getElementById("create-sound-form");

function openCreateModal() {
    resetCreateForm();
    modalCreate.classList.remove("hidden");
    initAudio();
}

function closeCreateModal() {
    stopRecording();
    modalCreate.classList.add("hidden");
}

function resetCreateForm() {
    createForm.reset();
    currentRecordedAudioBlob = null;
    recordedChunks = [];
    
    // Reset tabs
    setCreationTab("upload");
    
    // Clear upload fields
    fileInfoContainer.classList.add("hidden");
    dropZone.classList.remove("hidden");
    fileInput.value = "";
    
    // Clear record fields
    btnRecordAction.className = "record-btn";
    recordTimer.textContent = "00:00";
    recordStatus.textContent = "Click to start recording";
    micVisualizer.classList.add("hidden");
    
    // Clear previews
    audioPreviewContainer.classList.add("hidden");
    btnSubmitSound.disabled = true;
}

function setCreationTab(mode) {
    uploadMode = mode;
    if (mode === "upload") {
        tabUpload.classList.add("active");
        tabRecord.classList.remove("active");
        sectionUpload.classList.remove("hidden");
        sectionRecord.classList.add("hidden");
    } else {
        tabUpload.classList.remove("active");
        tabRecord.classList.add("active");
        sectionUpload.classList.add("hidden");
        sectionRecord.classList.remove("hidden");
    }
    
    // Enable/disable submit based on loaded data
    checkSubmitState();
}

function checkSubmitState() {
    const hasName = soundNameInput.value.trim().length > 0;
    const hasAudio = currentRecordedAudioBlob !== null;
    btnSubmitSound.disabled = !(hasName && hasAudio);
}

// File Drag/Drop
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--accent-color)";
    dropZone.style.backgroundColor = "var(--accent-glow)";
});

dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "var(--border-color)";
    dropZone.style.backgroundColor = "var(--bg-surface)";
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border-color)";
    dropZone.style.backgroundColor = "var(--bg-surface)";
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
});

function handleFileSelection(file) {
    if (!file.type.startsWith("audio/")) {
        showToast("Invalid file type! Please upload audio.");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast("File is too large! Maximum limit is 5MB.");
        return;
    }
    
    // Auto populate sound name from file name
    const prettyName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    soundNameInput.value = prettyName.replace(/[-_]/g, ' ').substring(0, 30);
    
    currentRecordedAudioBlob = file;
    fileNameText.textContent = file.name;
    
    dropZone.classList.add("hidden");
    fileInfoContainer.classList.remove("hidden");
    
    setupAudioPreview();
    checkSubmitState();
}

btnClearFile.addEventListener("click", () => {
    currentRecordedAudioBlob = null;
    fileInput.value = "";
    fileInfoContainer.classList.add("hidden");
    dropZone.classList.remove("hidden");
    audioPreviewContainer.classList.add("hidden");
    checkSubmitState();
});

// Microphone Recording Engine
btnRecordAction.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopRecording();
    } else {
        startRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            currentRecordedAudioBlob = new Blob(recordedChunks, { type: "audio/mp3" });
            
            // Stop mic tracks
            stream.getTracks().forEach(track => track.stop());
            
            setupAudioPreview();
            checkSubmitState();
            
            recordStatus.textContent = "Recording captured successfully!";
            micVisualizer.classList.add("hidden");
        };
        
        // Start recording
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Start Timer
        btnRecordAction.classList.add("recording");
        recordStatus.textContent = "Recording... Click button to stop.";
        micVisualizer.classList.remove("hidden");
        
        recordingTimerInterval = setInterval(() => {
            const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
            const mins = String(Math.floor(duration / 60)).padStart(2, '0');
            const secs = String(duration % 60).padStart(2, '0');
            recordTimer.textContent = `${mins}:${secs}`;
            
            // Limit to 30 seconds
            if (duration >= 30) {
                stopRecording();
            }
            
            // Simple mic visuals animation
            document.querySelectorAll(".mic-bar").forEach(bar => {
                const height = Math.floor(Math.random() * 26) + 4;
                bar.style.height = `${height}px`;
            });
        }, 100);
        
    } catch (err) {
        console.error("Mic Access Denied:", err);
        showToast("Microphone access is required to record audio!");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
    
    if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
    }
    
    btnRecordAction.classList.remove("recording");
}

// Audio Preview Controls
let previewAudio = null;
function setupAudioPreview() {
    if (previewAudio) {
        previewAudio.pause();
        previewAudio = null;
    }
    
    const url = URL.createObjectURL(currentRecordedAudioBlob);
    previewAudio = new Audio(url);
    audioPreviewContainer.classList.remove("hidden");
    
    previewAudio.onended = () => {
        btnPreviewPlay.textContent = "▶️ Play";
    };
}

btnPreviewPlay.addEventListener("click", () => {
    if (!previewAudio) return;
    
    if (previewAudio.paused) {
        previewAudio.play();
        btnPreviewPlay.textContent = "⏸️ Pause";
    } else {
        previewAudio.pause();
        btnPreviewPlay.textContent = "▶️ Play";
    }
});

// Text Change check state
soundNameInput.addEventListener("input", checkSubmitState);

// Submit Form - Save Custom Sound
createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentRecordedAudioBlob) return;
    
    const name = soundNameInput.value.trim();
    const category = soundCategorySelect.value;
    
    // Get button color value
    const colorOpt = document.querySelector('input[name="btn-color"]:checked');
    const color = colorOpt ? colorOpt.value : "red";
    
    const id = `custom-${Date.now()}`;
    
    try {
        // Convert Blob to ArrayBuffer for IndexedDB storage
        const arrayBuffer = await currentRecordedAudioBlob.arrayBuffer();
        
        const newSound = {
            id: id,
            name: name,
            category: category,
            color: color,
            isCustom: true,
            audioData: arrayBuffer,
            dateAdded: Date.now()
        };
        
        // Save to Database
        await saveCustomSoundToDB(newSound);
        
        // Add to runtime array
        sounds.unshift(newSound);
        
        // Success cleanup
        showToast(`Sound "${name}" created successfully!`);
        closeCreateModal();
        
        // Change category view to show custom sounds
        changeCategory("custom");
        
    } catch(err) {
        console.error("Save custom sound error:", err);
        showToast("Failed to save custom sound!");
    }
});

// Tab listeners
tabUpload.addEventListener("click", () => setCreationTab("upload"));
tabRecord.addEventListener("click", () => setCreationTab("record"));

// Toggle Color picker highlights
document.querySelectorAll(".color-opt").forEach(opt => {
    opt.addEventListener("click", () => {
        document.querySelectorAll(".color-opt").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
    });
});

btnAddSound.addEventListener("click", openCreateModal);
btnCloseCreate.addEventListener("click", closeCreateModal);
btnCancelCreate.addEventListener("click", closeCreateModal);

// Close modal if clicking background
modalCreate.addEventListener("click", (e) => {
    if (e.target === modalCreate) closeCreateModal();
});

// Empty State CTA click
const emptyStateCreateBtn = document.getElementById("empty-state-create-btn");
emptyStateCreateBtn.addEventListener("click", openCreateModal);

// -----------------------------------------------------------------
// 10. Search, Category Navigation, and Theme Toggle
// -----------------------------------------------------------------
const searchInput = document.getElementById("search-input");
const searchClearBtn = document.getElementById("search-clear-btn");

searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length > 0) {
        searchClearBtn.classList.remove("hidden");
    } else {
        searchClearBtn.classList.add("hidden");
    }
    renderSoundGrid();
});

searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClearBtn.classList.add("hidden");
    renderSoundGrid();
    searchInput.focus();
});

// Category Navigation
function changeCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll(".category-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.category === cat);
    });
    renderSoundGrid();
}

document.querySelectorAll(".category-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        changeCategory(chip.dataset.category);
    });
});

// Theme Toggle
const themeToggle = document.getElementById("theme-toggle");
let currentTheme = localStorage.getItem("theme") || "dark";

// Apply saved theme
document.body.className = currentTheme === "dark" ? "dark-theme" : "light-theme";

themeToggle.addEventListener("click", () => {
    if (currentTheme === "dark") {
        currentTheme = "light";
        document.body.className = "light-theme";
    } else {
        currentTheme = "dark";
        document.body.className = "dark-theme";
    }
    localStorage.setItem("theme", currentTheme);
});

// -----------------------------------------------------------------
// 11. Initial Entry & Deep Linking Setup
// -----------------------------------------------------------------
async function initApp() {
    try {
        // Initialize Custom database
        await initDB();
        
        // Fetch custom sound templates
        const customSounds = await loadCustomSounds();
        sounds = [...customSounds.sort((a,b) => b.dateAdded - a.dateAdded), ...DEFAULT_SOUNDS];
        
    } catch(err) {
        console.warn("Could not load IndexedDB. Falling back to online sounds only.", err);
    }
    
    // Initial Render
    renderSoundGrid();
    
    // Parse deep links
    const params = new URLSearchParams(window.location.search);
    const soundId = params.get("sound");
    if (soundId) {
        const soundExists = sounds.some(s => s.id === soundId);
        if (soundExists) {
            // Scroll to the card
            setTimeout(() => {
                const card = document.getElementById(`card-${soundId}`);
                if (card) {
                    card.scrollIntoView({ behavior: "smooth", block: "center" });
                    // Give it a brief pop glow effect
                    card.classList.add("pulse-glow");
                    setTimeout(() => card.classList.remove("pulse-glow"), 3000);
                }
                // Open detail page modal
                openDetailsModal(soundId);
            }, 500);
        }
    }
}

// Start Application
window.addEventListener("DOMContentLoaded", initApp);
