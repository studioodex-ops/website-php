            const p = window.newsData[id];
            if (!p) return;
            openNewsModal();
            document.getElementById('news-modal-title').innerText = "Edit News Article";
            document.getElementById('news-edit-id').value = id;
            document.getElementById('nm-title').value = p.title;
            document.getElementById('nm-date').value = p.date;
            document.getElementById('nm-desc').value = p.content;
            document.getElementById('nm-image').value = p.image || '';
        }

        document.getElementById('news-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('news-edit-id').value;
            const data = {
                title: document.getElementById('nm-title').value,
                date: document.getElementById('nm-date').value,
                content: document.getElementById('nm-desc').value,
                image: document.getElementById('nm-image').value,
                createdAt: new Date().toISOString()
            };

            const btn = e.target.querySelector('button[type="submit"]');
            const fileInput = document.getElementById('nm-image-file');
            const orgText = btn.innerText;

            btn.disabled = true;

            try {
                if (fileInput.files.length > 0) {
                    btn.innerText = "Uploading...";
                    const url = await uploadImage(fileInput.files[0], 'news');
                    data.image = url;
                }

                btn.innerText = "Saving...";

                if (id) {
                    await setDoc(doc(db, "news", id), data, { merge: true });
                } else {
                    await setDoc(doc(collection(db, "news")), data);
                }
                closeNewsModal();
                fetchNews();
            } catch (e) {
                alert(e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Save";
            }
        };

        window.deleteNews = async (id) => {
            if (!confirm("Delete this article?")) return;
            try {
                await deleteDoc(doc(db, 'news', id));
                fetchNews();
            } catch (e) {
                alert(e.message);
            }
        }

        // --- SOCIAL POST GENERATOR ---
        window.closeSocialModal = () => {
            const m = document.getElementById('social-modal');
            const c = document.getElementById('social-modal-content');
            c.classList.remove('scale-100', 'opacity-100');
            c.classList.add('scale-95', 'opacity-0');
            setTimeout(() => m.classList.add('hidden'), 300);
        };

        window.manualImageSrc = null;

        window.handleManualImage = (input) => {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    window.manualImageSrc = e.target.result;
                    redrawCanvas();
                }
                reader.readAsDataURL(input.files[0]);
            }
        };

        window.redrawCanvas = async () => {
            const canvas = document.getElementById('social-canvas');
            const ctx = canvas.getContext('2d');

            // Get current data
            const type = window.currentSocialType;
            const id = window.currentSocialId;
            let data = (type === 'promotion') ? window.promoData[id] : window.newsData[id];

            const title = data.title;
            const desc = data.description || data.content;
            const imgUrl = window.manualImageSrc || data.image;

            // Draw Image
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 1080, 1080);

            if (imgUrl) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = imgUrl;

                try {
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error("Load Failed"));
                        if (!imgUrl.startsWith('data:')) setTimeout(() => reject(new Error('Timeout')), 10000);
                    });

                    const scale = Math.max(1080 / img.width, 1080 / img.height);
                    const x = (1080 - img.width * scale) / 2;
                    const y = (1080 - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                    const grad = ctx.createLinearGradient(0, 500, 0, 1080);
                    grad.addColorStop(0, 'transparent');
