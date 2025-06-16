class CVGenerator {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.signatureFile = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
    }

    initializeElements() {
        this.form = document.getElementById('cvForm');
        this.companyInput = document.getElementById('companyName');
        this.positionInput = document.getElementById('position');
        this.signatureInput = document.getElementById('signature');
        this.generateBtn = document.getElementById('generateBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.signaturePreview = document.getElementById('signaturePreview');
        this.previewCompany = document.getElementById('previewCompany');
        this.previewPosition = document.getElementById('previewPosition');
        this.signatureImage = document.getElementById('signatureImage');
        this.cvPreview = document.getElementById('cvPreview');
        this.documentInput = document.getElementById('documentList');
        this.previewDocumentList = document.getElementById('previewDocumentList');
    }

    attachEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generatePreview());
        this.exportBtn.addEventListener('click', () => this.exportToPDF());
        this.signatureInput.addEventListener('change', (e) => this.handleSignatureUpload(e));
        this.companyInput.addEventListener('input', () => this.updatePreview());
        this.positionInput.addEventListener('input', () => this.updatePreview());
    }

    handleSignatureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Upload file gambar yang valid.');
            event.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file maksimal 2MB.');
            event.target.value = '';
            return;
        }

        this.signatureFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '150px';
            img.style.maxHeight = '80px';
            img.style.objectFit = 'contain';
            this.signaturePreview.innerHTML = '';
            this.signaturePreview.appendChild(img);

            this.signatureImage.src = e.target.result;
            this.signatureImage.style.display = 'block';
        };
        reader.onerror = () => {
            alert('Gagal membaca file.');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }

    updatePreview() {
        const companyName = this.companyInput.value.trim() || 'CV. PRIMA MANDIRI SAKTI';
        const position = this.positionInput.value.trim() || 'Staff Administrasi';
        this.previewCompany.textContent = companyName;
        this.previewPosition.textContent = position;

        this.previewDocumentList.innerHTML = '';
        const docItems = (this.documentInput.value || '')
            .split(',')
            .map(i => i.trim())
            .filter(i => i);
        if (docItems.length === 0) {
            docItems.push("Curriculum Vitae", "Ijazah Terakhir, dan Transkip Nilai", "Foto Terbaru", "Berkas Pendukung");
        }
        docItems.forEach(doc => {
            const li = document.createElement('li');
            li.textContent = doc;
            this.previewDocumentList.appendChild(li);
        });
    }

    generatePreview() {
        if (!this.positionInput.value.trim()) {
            alert('Posisi harus diisi.');
            this.positionInput.focus();
            return;
        }
        if (!this.signatureFile) {
            alert('Tanda tangan wajib diupload.');
            this.signatureInput.focus();
            return;
        }

        this.updatePreview();
        this.exportBtn.disabled = false;
        this.enableSignatureDragging();
        this.cvPreview.scrollIntoView({ behavior: 'smooth' });
        this.showMessage('Preview berhasil dibuat. Geser tanda tangan jika perlu.', 'success');
    }

    async exportToPDF() {
        try {
            this.showMessage('Mempersiapkan PDF...', 'info');
            this.exportBtn.disabled = true;
            this.exportBtn.textContent = 'Processing...';

            // Sembunyikan elemen tidak perlu
            document.querySelectorAll('.exclude-pdf').forEach(el => {
                el.style.visibility = 'hidden';
            });

            // Hapus border dari tanda tangan
            this.signatureImage.style.border = 'none';

            await this.waitForImages();
            const canvas = await html2canvas(this.cvPreview, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: this.cvPreview.scrollWidth,
                height: this.cvPreview.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let positionY = 0;

            pdf.addImage(imgData, 'PNG', 0, positionY, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            while (heightLeft >= 0) {
                positionY = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, positionY, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const filename = `${this.positionInput.value.trim().toLowerCase().replace(/\s+/g, '_')}_${this.companyInput.value.trim().toLowerCase().replace(/\s+/g, '_') || 'perusahaan'}_salmah_nur_laila.pdf`;
            pdf.save(filename);
            this.showMessage('PDF berhasil dibuat!', 'success');
        } catch (err) {
            console.error(err);
            this.showMessage('Gagal membuat PDF.', 'error');
        } finally {
            // Tampilkan kembali elemen
            document.querySelectorAll('.exclude-pdf').forEach(el => {
                el.style.visibility = '';
            });

            this.exportBtn.disabled = false;
            this.exportBtn.textContent = 'Export to PDF';
        }
    }

    waitForImages() {
        return new Promise((resolve) => {
            const images = this.cvPreview.querySelectorAll('img');
            if (images.length === 0) return resolve();

            let loaded = 0;
            images.forEach(img => {
                if (img.complete) loaded++;
                else {
                    img.onload = img.onerror = () => {
                        loaded++;
                        if (loaded === images.length) resolve();
                    };
                }
            });

            if (loaded === images.length) resolve();
        });
    }

    enableSignatureDragging() {
        const signatureImg = this.signatureImage;
        const container = signatureImg.parentElement;
        if (!signatureImg || signatureImg.style.display === 'none') return;

        signatureImg.classList.add('draggable');

        const startDrag = (e) => {
            this.isDragging = true;
            signatureImg.style.zIndex = '1000';
            const rect = signatureImg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const client = e.type.startsWith('touch') ? e.touches[0] : e;
            this.dragOffset.x = client.clientX - rect.left;
            this.dragOffset.y = client.clientY - rect.top;
            e.preventDefault();
        };

        const drag = (e) => {
            if (!this.isDragging) return;
            const client = e.type.startsWith('touch') ? e.touches[0] : e;
            const containerRect = container.getBoundingClientRect();
            let newX = client.clientX - containerRect.left - this.dragOffset.x;
            let newY = client.clientY - containerRect.top - this.dragOffset.y;

            // Tanpa batasan bawah
            newX = Math.max(0, newX);
            signatureImg.style.left = `${newX}px`;
            signatureImg.style.top = `${newY}px`;
            e.preventDefault();
        };

        const endDrag = () => {
            this.isDragging = false;
            signatureImg.style.zIndex = 'auto';
        };

        signatureImg.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        signatureImg.addEventListener('touchstart', startDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', endDrag);

        this.addResetPositionButton();
    }

    addResetPositionButton() {
        if (document.getElementById('resetSignatureBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'resetSignatureBtn';
        btn.className = 'exclude-pdf';
        btn.type = 'button';
        btn.textContent = 'Reset Posisi TTD';
        btn.style.cssText = `
            margin-top: 10px;
            padding: 8px 12px;
            background-color: #ffc107;
            color: #212529;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            display: block;
            margin-left: auto;
            margin-right: auto;
        `;

        btn.addEventListener('click', () => {
            this.signatureImage.style.top = '10px';
            this.signatureImage.style.left = 'auto';
            this.signatureImage.style.right = '0';
            this.showMessage('Posisi tanda tangan direset.', 'info');
        });

        document.querySelector('.signature-container').parentNode.insertBefore(btn, document.querySelector('.signature-container').nextSibling);
    }

    showMessage(msg, type = 'info') {
        document.querySelectorAll('.message').forEach(e => e.remove());
        const div = document.createElement('div');
        div.className = `message message-${type}`;
        div.textContent = msg;
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 300px;
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        switch (type) {
            case 'success': div.style.background = '#d4edda'; div.style.color = '#155724'; break;
            case 'error': div.style.background = '#f8d7da'; div.style.color = '#721c24'; break;
            default: div.style.background = '#d1ecf1'; div.style.color = '#0c5460'; break;
        }
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CVGenerator();
});
