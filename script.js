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
        
        // Real-time preview updates
        this.companyInput.addEventListener('input', () => this.updatePreview());
        this.positionInput.addEventListener('input', () => this.updatePreview());
    }

    handleSignatureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            event.target.value = '';
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size should be less than 2MB.');
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

            // Update main signature image
            this.signatureImage.src = e.target.result;
            this.signatureImage.style.display = 'block';
        };

        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            event.target.value = '';
        };

        reader.readAsDataURL(file);
    }

    updatePreview() {
        const companyName = this.companyInput.value.trim() || 'CV. PRIMA MANDIRI SAKTI';
        const position = this.positionInput.value.trim() || 'Staff Administrasi';

        this.previewCompany.textContent = companyName;
        this.previewPosition.textContent = position;
        // Update daftar dokumen
        this.previewDocumentList.innerHTML = ''; // clear existing
        const docItems = (this.documentInput.value || '').split(',').map(i => i.trim()).filter(i => i);

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
        // Validate required fields
        if (!this.positionInput.value.trim()) {
            alert('Posisi yang dilamar harus diisi.');
            this.positionInput.focus();
            return;
        }

        if (!this.signatureFile) {
            alert('Tanda tangan harus diupload.');
            this.signatureInput.focus();
            return;
        }

        this.updatePreview();
        this.exportBtn.disabled = false;
        
        // Enable signature dragging after preview is generated
        this.enableSignatureDragging();
        
        // Scroll to preview
        this.cvPreview.scrollIntoView({ behavior: 'smooth' });

        // Show success message
        this.showMessage('Preview berhasil dibuat! Sekarang Anda dapat menggeser posisi tanda tangan dan export ke PDF.', 'success');
    }

    async exportToPDF() {
        try {
            this.showMessage('Sedang memproses PDF...', 'info');
            this.exportBtn.disabled = true;
            this.exportBtn.textContent = 'Processing...';

            // Generate filename
            const position = this.positionInput.value.trim().toLowerCase().replace(/\s+/g, '_');
            const company = this.companyInput.value.trim().toLowerCase().replace(/\s+/g, '_') || 'perusahaan';
            const filename = `${position}_${company}_salmah_nur_laila.pdf`;

            // Wait for images to load
            await this.waitForImages();

            // Create PDF using html2canvas and jsPDF
            const canvas = await html2canvas(this.cvPreview, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: this.cvPreview.scrollWidth,
                height: this.cvPreview.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let positionY = 0;

            // Add first page
            pdf.addImage(imgData, 'PNG', 0, positionY, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add additional pages if needed
            while (heightLeft >= 0) {
                positionY = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, positionY, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save the PDF
            pdf.save(filename);
            
            this.showMessage('PDF berhasil diexport!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showMessage('Terjadi kesalahan saat membuat PDF. Silakan coba lagi.', 'error');
        } finally {
            this.exportBtn.disabled = false;
            this.exportBtn.textContent = 'Export to PDF';
        }
    }

    waitForImages() {
        return new Promise((resolve) => {
            const images = this.cvPreview.querySelectorAll('img');
            if (images.length === 0) {
                resolve();
                return;
            }

            let loadedCount = 0;
            const totalImages = images.length;

            images.forEach((img) => {
                if (img.complete) {
                    loadedCount++;
                } else {
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === totalImages) {
                            resolve();
                        }
                    };
                    img.onerror = () => {
                        loadedCount++;
                        if (loadedCount === totalImages) {
                            resolve();
                        }
                    };
                }
            });

            if (loadedCount === totalImages) {
                resolve();
            }
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
            
            if (e.type === 'mousedown') {
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
            } else if (e.type === 'touchstart') {
                const touch = e.touches[0];
                this.dragOffset.x = touch.clientX - rect.left;
                this.dragOffset.y = touch.clientY - rect.top;
            }
            
            e.preventDefault();
        };
        
        const drag = (e) => {
            if (!this.isDragging) return;
            
            const containerRect = container.getBoundingClientRect();
            let clientX, clientY;
            
            if (e.type === 'mousemove') {
                clientX = e.clientX;
                clientY = e.clientY;
            } else if (e.type === 'touchmove') {
                const touch = e.touches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
            }
            
            let newX = clientX - containerRect.left - this.dragOffset.x;
            let newY = clientY - containerRect.top - this.dragOffset.y;
            
            // Boundary checks
            const maxX = container.offsetWidth - signatureImg.offsetWidth;
            const maxY = container.offsetHeight - signatureImg.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            signatureImg.style.left = newX + 'px';
            signatureImg.style.top = newY + 'px';
            signatureImg.style.right = 'auto';
            
            e.preventDefault();
        };
        
        const endDrag = () => {
            this.isDragging = false;
            signatureImg.style.zIndex = 'auto';
        };
        
        // Mouse events
        signatureImg.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        
        // Touch events for mobile
        signatureImg.addEventListener('touchstart', startDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', endDrag);
        
        // Reset position button
        this.addResetPositionButton();
    }
    
    addResetPositionButton() {
        // Check if button already exists
        if (document.getElementById('resetSignatureBtn')) return;
        
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetSignatureBtn';
        resetBtn.textContent = 'Reset Posisi TTD';
        resetBtn.type = 'button';
        resetBtn.style.cssText = `
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
        
        resetBtn.addEventListener('click', () => {
            this.signatureImage.style.right = '0';
            this.signatureImage.style.top = '10px';
            this.signatureImage.style.left = 'auto';
            this.showMessage('Posisi tanda tangan direset ke posisi awal.', 'info');
        });
        
        // Add button after the signature container
        const signatureContainer = document.querySelector('.signature-container');
        signatureContainer.parentNode.insertBefore(resetBtn, signatureContainer.nextSibling);
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        // Style the message
        messageDiv.style.cssText = `
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

        // Set colors based on type
        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = '#d4edda';
                messageDiv.style.color = '#155724';
                messageDiv.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#f8d7da';
                messageDiv.style.color = '#721c24';
                messageDiv.style.border = '1px solid #f5c6cb';
                break;
            case 'info':
            default:
                messageDiv.style.backgroundColor = '#d1ecf1';
                messageDiv.style.color = '#0c5460';
                messageDiv.style.border = '1px solid #bee5eb';
                break;
        }

        document.body.appendChild(messageDiv);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CVGenerator();
});

// Add some utility functions for better user experience
document.addEventListener('DOMContentLoaded', () => {
    // Add input validation styling
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('invalid', () => {
            input.style.borderColor = '#dc3545';
        });
        
        input.addEventListener('input', () => {
            if (input.validity.valid) {
                input.style.borderColor = '#28a745';
            } else {
                input.style.borderColor = '#dc3545';
            }
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to generate preview
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('generateBtn').click();
        }
        
        // Ctrl/Cmd + S to export PDF
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (!document.getElementById('exportBtn').disabled) {
                document.getElementById('exportBtn').click();
            }
        }
    });
});
