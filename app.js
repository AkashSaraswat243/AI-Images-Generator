
document.addEventListener('DOMContentLoaded', function () {
    // API Token
    const API_TOKEN = "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";

    // DOM Elements
    const generateBtn = document.getElementById('generateBtn');
    const promptInput = document.getElementById('prompt');
    const negativePromptInput = document.getElementById('negativePrompt');
    const modelSelect = document.getElementById('model');
    const stepsInput = document.getElementById('steps');
    const stepsValue = document.getElementById('stepsValue');
    const guidanceInput = document.getElementById('guidance');
    const guidanceValue = document.getElementById('guidanceValue');
    const seedInput = document.getElementById('seed');
    const generatedImage = document.getElementById('generatedImage');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const loadingDiv = document.querySelector('.loading');
    const loadingStatus = document.getElementById('loadingStatus');
    const progressPercent = document.getElementById('progressPercent');
    const progressBar = document.getElementById('progressBar');
    const loadingTip = document.getElementById('loadingTip');
    const errorMessage = document.getElementById('errorMessage');
    const imageActions = document.getElementById('imageActions');
    const downloadBtn = document.getElementById('downloadBtn');
    const upscaleBtn = document.getElementById('upscaleBtn');
    const shareBtn = document.getElementById('shareBtn');
    const gallery = document.getElementById('gallery');
    const clearGalleryBtn = document.getElementById('clearGalleryBtn');
    const themeToggle = document.getElementById('themeToggle');

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        themeToggle.innerHTML = document.body.classList.contains('dark-mode')
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    });

    // Check for saved theme preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Update range input values
    stepsInput.addEventListener('input', () => {
        stepsValue.textContent = stepsInput.value;
    });

    guidanceInput.addEventListener('input', () => {
        guidanceValue.textContent = guidanceInput.value;
    });

    // Load saved generations from localStorage
    let generations = JSON.parse(localStorage.getItem('generations')) || [];
    renderGallery();

    // Generate Image
    generateBtn.addEventListener('click', generateImage);

    async function generateImage() {
        const prompt = promptInput.value.trim();

        if (!prompt) {
            showError('Please enter a prompt');
            return;
        }

        // Clear previous results
        generatedImage.style.display = 'none';
        imagePlaceholder.style.display = 'flex';
        errorMessage.style.display = 'none';
        imageActions.style.display = 'none';

        // Show loading state
        generateBtn.disabled = true;
        loadingDiv.style.display = 'flex';

        // Simulate progress (since we can't get real progress from API)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 95) progress = 95;
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${Math.floor(progress)}%`;

            if (progress < 30) {
                loadingStatus.textContent = "Initializing model...";
                loadingTip.textContent = "First generation may take longer as the model loads";
            } else if (progress < 60) {
                loadingStatus.textContent = "Generating your image...";
                loadingTip.textContent = "Higher steps (40-50) produce better quality images";
            } else {
                loadingStatus.textContent = "Finalizing details...";
                loadingTip.textContent = "Almost there! Your image is being processed";
            }
        }, 500);

        try {
            const model = modelSelect.value;
            const negativePrompt = negativePromptInput.value.trim();
            const steps = stepsInput.value;
            const guidance = guidanceInput.value;
            const seed = seedInput.value.trim();

            // Prepare request data
            const data = {
                inputs: prompt,
                options: {
                    use_cache: false,
                    wait_for_model: true
                },
                parameters: {
                    num_inference_steps: parseInt(steps),
                    guidance_scale: parseFloat(guidance)
                }
            };

            if (negativePrompt) data.parameters.negative_prompt = negativePrompt;
            if (seed) data.parameters.seed = parseInt(seed);

            // API Call
            const response = await fetch(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate image');
            }

            // Get image blob
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            // Display image
            generatedImage.onload = () => {
                URL.revokeObjectURL(imageUrl); // Clean up
                clearInterval(progressInterval);
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
                loadingStatus.textContent = "Generation complete!";

                setTimeout(() => {
                    loadingDiv.style.display = 'none';
                    imagePlaceholder.style.display = 'none';
                    generatedImage.style.display = 'block';
                    imageActions.style.display = 'flex';
                }, 500);
            };
            generatedImage.src = imageUrl;

            // Save to gallery
            const generation = {
                prompt,
                model,
                date: new Date().toISOString(),
                imageUrl,
                steps,
                guidance,
                seed: seed || 'random'
            };

            generations.unshift(generation);
            localStorage.setItem('generations', JSON.stringify(generations));
            renderGallery();

        } catch (error) {
            clearInterval(progressInterval);
            let errorMsg = error.message;

            if (errorMsg.includes('loading')) {
                errorMsg = 'Model is loading. Please try again in 30-60 seconds.';
            } else if (errorMsg.includes('NSFW')) {
                errorMsg = 'Content violation. Try a different prompt that complies with content policies.';
            } else if (errorMsg.includes('timeout')) {
                errorMsg = 'Request timed out. Please try again with a simpler prompt.';
            }

            showError(errorMsg);
        } finally {
            generateBtn.disabled = false;
        }
    }

    // Render gallery
    function renderGallery() {
        if (generations.length === 0) {
            gallery.innerHTML = `
                        <div class="gallery-empty">
                            <i class="fas fa-images" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary);"></i>
                            <p>No images generated yet</p>
                            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Your generated images will appear here</p>
                        </div>
                    `;
            return;
        }

        gallery.innerHTML = generations.map((gen, index) => `
                    <div class="image-card fade-in" style="animation-delay: ${index * 0.1}s">
                        <img src="${gen.imageUrl}" alt="${gen.prompt.substring(0, 50)}">
                        <div class="image-info">
                            <h4 title="${gen.prompt}">${gen.prompt.substring(0, 70)}${gen.prompt.length > 70 ? '...' : ''}</h4>
                            <div class="image-meta">
                                <span>${gen.model.split('/')[1]}</span>
                                <span>${new Date(gen.date).toLocaleString()}</span>
                            </div>
                            <div class="image-actions">
                                <button class="btn btn-sm download-gallery" data-url="${gen.imageUrl}" data-prompt="${gen.prompt}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                                <button class="btn btn-sm use-prompt" data-prompt="${gen.prompt}">
                                    <i class="fas fa-redo"></i> Reuse
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

        // Add event listeners to new buttons
        document.querySelectorAll('.download-gallery').forEach(btn => {
            btn.addEventListener('click', () => {
                downloadImage(btn.dataset.url, btn.dataset.prompt);
            });
        });

        document.querySelectorAll('.use-prompt').forEach(btn => {
            btn.addEventListener('click', () => {
                promptInput.value = btn.dataset.prompt;
                promptInput.focus();
            });
        });
    }

    // Clear gallery
    clearGalleryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your generation history?')) {
            generations = [];
            localStorage.setItem('generations', JSON.stringify(generations));
            renderGallery();
        }
    });

    // Download image
    downloadBtn.addEventListener('click', () => {
        if (generatedImage.src && generatedImage.src.startsWith('blob:')) {
            downloadImage(generatedImage.src, promptInput.value || 'generated-image');
        } else {
            showError('Please generate an image first');
        }
    });

    function downloadImage(url, prompt) {
        try {
            // Create a temporary anchor element for download
            const a = document.createElement('a');
            a.href = url; // Use the existing blob URL directly
            a.download = `ai-art-${prompt.substring(0, 20).toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Clean up the blob URL after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('Download error:', error);
            showError('Failed to download image. Ensure the image is generated and try again.');
        }
    }

    // Share image
    shareBtn.addEventListener('click', () => {
        if (generatedImage.src) {
            shareImage(generatedImage.src, promptInput.value);
        }
    });

    async function shareImage(url, prompt) {
        try {
            // Convert blob URL to blob
            const response = await fetch(url);
            const blob = await response.blob();

            if (navigator.share && navigator.canShare({ files: [new File([blob], 'ai-art.jpg', { type: 'image/jpeg' })] })) {
                await navigator.share({
                    title: 'AI Generated Art',
                    text: `"${prompt}" - Created with AI Art Studio`,
                    files: [new File([blob], 'ai-art.jpg', { type: 'image/jpeg' })]
                });
            } else {
                // Fallback for browsers without Web Share API
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.click();
            }
        } catch (err) {
            console.error('Error sharing:', err);
            showError('Sharing failed. You can download the image instead.');
        }
    }

    // Upscale image (placeholder functionality)
    upscaleBtn.addEventListener('click', () => {
        alert('Premium feature: Image upscaling coming soon!');
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        loadingDiv.style.display = 'none';

        // Scroll to error smoothly
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});