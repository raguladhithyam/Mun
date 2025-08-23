// Global variables
let currentRegistrations = [];
let dashboardLoaded = false;

// OTP Authentication variables
let otpSession = null;
let adminUsers = [];

// Check if Axios is available, if not, create a simple fallback
if (typeof axios === 'undefined') {
    console.warn('Axios not loaded, using fallback HTTP client');
    window.axios = {
        post: async (url, data, config) => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: data,
                    headers: config?.headers || {}
                });
                const result = await response.json();
                return { data: result };
            } catch (error) {
                throw { response: { data: { message: error.message } } };
            }
        },
        get: async (url) => {
            try {
                const response = await fetch(url);
                const result = await response.json();
                return { data: result };
            } catch (error) {
                throw { response: { data: { message: error.message } } };
            }
        }
    };
}

// DOM Elements - with null checks for different pages
const elements = {
    form: document.getElementById('ebForm'),
    backToForm: document.getElementById('backToForm'),
    applicationForm: document.getElementById('applicationForm'),
    adminDashboard: document.getElementById('adminDashboard'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    successModal: document.getElementById('successModal'),
    closeModal: document.getElementById('closeModal'),
    fileLinksModal: document.getElementById('fileLinksModal'),
    closeFileLinksModal: document.getElementById('closeFileLinksModal'),
    registrationDetailsContent: document.getElementById('registrationDetailsContent'),
    registrationEditContent: document.getElementById('registrationEditContent'),
    modalTitle: document.getElementById('modalTitle'),
    editBtn: document.getElementById('editBtn'),
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    submitBtn: document.getElementById('submitBtn'),
    exportBtn: document.getElementById('exportBtn'),
    mailerForm: document.getElementById('mailerForm'),
    searchInput: document.getElementById('searchInput'),
    committeeFilter: document.getElementById('committeeFilter'),
    positionFilter: document.getElementById('positionFilter'),
    previewBtn: document.getElementById('previewBtn')
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.appInitialized) {
        return;
    }
    window.appInitialized = true;
    
    initializeEventListeners();
    initializeFileUploads();
    initializePage();
});

// Handle routing based on URL
function handleRouting() {
    const path = window.location.pathname;
    
    if (path === '/admin') {
        // Admin page - load dashboard data
        if (elements.adminDashboard && !dashboardLoaded) {
            loadDashboardData();
        }
    }
}

// Event Listeners
function initializeEventListeners() {
    // Form submission
    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmission);
    }
    
    // Navigation - only add if element exists (for admin page)
    if (elements.backToForm) {
        elements.backToForm.addEventListener('click', () => {
            window.location.href = '/form';
        });
    }
    
    // Modal
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', hideSuccessModal);
    }
    
    // File Links Modal
    if (elements.closeFileLinksModal) {
        elements.closeFileLinksModal.addEventListener('click', hideFileLinksModal);
    }
    if (elements.editBtn) {
        elements.editBtn.addEventListener('click', startEditMode);
    }
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveRegistration);
    }
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', cancelEditMode);
    }
    
    // File Viewer Modal
    const closeFileViewer = document.getElementById('closeFileViewer');
    const fileViewerModal = document.getElementById('fileViewerModal');
    
    if (closeFileViewer) {
        closeFileViewer.addEventListener('click', hideFileViewerModal);
    }
    if (fileViewerModal) {
        fileViewerModal.addEventListener('click', (e) => {
            if (e.target === fileViewerModal) {
                hideFileViewerModal();
            }
        });
    }
    
    // Close modal when clicking outside
    if (elements.fileLinksModal) {
        elements.fileLinksModal.addEventListener('click', (e) => {
            if (e.target === elements.fileLinksModal) {
                hideFileLinksModal();
            }
        });
    }
    
    // Email Preview Modal
    const closeEmailPreview = document.getElementById('closeEmailPreview');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const sendFromPreview = document.getElementById('sendFromPreview');
    
    if (closeEmailPreview) {
        closeEmailPreview.addEventListener('click', hideEmailPreviewModal);
    }
    if (closePreviewModal) {
        closePreviewModal.addEventListener('click', hideEmailPreviewModal);
    }
    if (sendFromPreview) {
        sendFromPreview.addEventListener('click', sendEmailFromPreview);
    }
    
    // Dashboard tabs - only add if elements exist (for admin page)
    if (elements.tabBtns.length > 0) {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    }
    
    // Export functionality - only add if element exists (for admin page)
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Mailer form - only add if element exists (for admin page)
    if (elements.mailerForm) {
        elements.mailerForm.addEventListener('submit', handleMailerSubmission);
        
        // Add mailer tab functionality
        const mailerTabBtns = document.querySelectorAll('.mailer-tab-btn');
        mailerTabBtns.forEach(btn => {
            btn.addEventListener('click', handleMailerTabChange);
        });
    }
    
    // Search functionality - only add if element exists (for admin page)
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }
    
    // Filter functionality - only add if elements exist (for admin page)
    if (elements.committeeFilter) {
        elements.committeeFilter.addEventListener('change', handleFilter);
    }
    if (elements.positionFilter) {
        elements.positionFilter.addEventListener('change', handleFilter);
    }
    
    // Preview functionality - only add if element exists (for admin page)
    if (elements.previewBtn) {
        elements.previewBtn.addEventListener('click', handlePreview);
    }
    
    // Initialize custom multi-select dropdown
    if (document.getElementById('recipientsDisplay')) {
        initializeCustomMultiSelect();
    }
    
    // Logout button - set up for admin page
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Table action buttons event delegation
    const registrationsTable = document.getElementById('registrationsTable');
    if (registrationsTable) {
        registrationsTable.addEventListener('click', handleTableAction);
    }
    
    // File link actions event delegation
    document.addEventListener('click', handleFileLinkActions);
    
    // Multi-select and file removal event delegation
    document.addEventListener('click', handleMultiSelectActions);
    
    // File validation - only add if file inputs exist (for form page)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    if (fileInputs.length > 0) {
        fileInputs.forEach(input => {
            input.addEventListener('change', validateFile);
        });
    }
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleRouting);
    
    // Handle keyboard events for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.fileLinksModal && elements.fileLinksModal.style.display === 'flex') {
                hideFileLinksModal();
            }
            if (elements.successModal && elements.successModal.style.display === 'flex') {
                hideSuccessModal();
            }
            if (document.getElementById('fileViewerModal') && document.getElementById('fileViewerModal').style.display === 'flex') {
                hideFileViewerModal();
            }
        }
    });
}

// File upload initialization
function initializeFileUploads() {
    const fileWrappers = document.querySelectorAll('.file-input-wrapper');
    if (fileWrappers.length === 0) {
        return;
    }
    
    fileWrappers.forEach(wrapper => {
        const input = wrapper.querySelector('input[type="file"]');
        const display = wrapper.querySelector('.file-input-display span');
        
        if (!input || !display) {
            console.warn('File upload wrapper missing required elements');
            return;
        }
        
        // Drag and drop functionality
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.style.borderColor = 'var(--accent-1)';
            wrapper.style.background = 'rgba(121, 125, 250, 0.1)';
        });
        
        wrapper.addEventListener('dragleave', (e) => {
            e.preventDefault();
            wrapper.style.borderColor = 'var(--border)';
            wrapper.style.background = 'transparent';
        });
        
        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.style.borderColor = 'var(--border)';
            wrapper.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                updateFileDisplay(input, display);
                validateFile({ target: input });
            }
        });
        
        input.addEventListener('change', () => {
            updateFileDisplay(input, display);
        });
    });
}

// Update file display
function updateFileDisplay(input, display) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        display.textContent = file.name;
        display.style.color = 'var(--primary)';
        display.style.fontWeight = '500';
    } else {
        display.textContent = input.required ? 'Choose file or drag here' : 'Choose file or drag here (Optional)';
        display.style.color = 'var(--text-light)';
        display.style.fontWeight = 'normal';
    }
}

// File validation
function validateFile(event) {
    const input = event.target;
    const file = input.files[0];
    
    if (!file) return;
    
    // Check file type
    if (file.type !== 'application/pdf') {
        showError('Only PDF files are allowed.');
        input.value = '';
        updateFileDisplay(input, input.parentElement.querySelector('.file-input-display span'));
        return;
    }
    
    // Check file size
    const maxSize = input.id === 'chairingResume' ? 3 * 1024 * 1024 : 2 * 1024 * 1024; // 3MB or 2MB
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        showError(`File size must be less than ${maxSizeMB}MB.`);
        input.value = '';
        updateFileDisplay(input, input.parentElement.querySelector('.file-input-display span'));
        return;
    }
}

// Form submission handler
async function handleFormSubmission(event) {
    event.preventDefault();
    
    try {
    showLoading();
    
        // Get form data
        const formData = new FormData(elements.form);
        
        // Validate required fields
        const requiredFields = ['name', 'email', 'phone', 'college', 'department', 'year'];
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                throw new Error(`Please fill in all required fields. Missing: ${field}`);
            }
        }
        
        // Validate file uploads
        if (!formData.get('idCard')) {
            throw new Error('Please upload your ID Card.');
        }
        
        // Get checkbox values
        const committees = Array.from(document.querySelectorAll('input[name="committees"]:checked')).map(cb => cb.value);
        const positions = Array.from(document.querySelectorAll('input[name="positions"]:checked')).map(cb => cb.value);
        
        if (committees.length === 0) {
            throw new Error('Please select at least one committee preference.');
        }
        
        if (positions.length === 0) {
            throw new Error('Please select at least one position preference.');
        }
        
        // Add checkbox values to form data
        formData.set('committees', JSON.stringify(committees));
        formData.set('positions', JSON.stringify(positions));
        
        // Submit form
        const response = await axios.post('/api/submit', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data.success) {
        hideLoading();
        showSuccessModal();
        elements.form.reset();
            
            // Reset file displays
            document.querySelectorAll('.file-input-display span').forEach(span => {
                span.textContent = span.textContent.includes('Optional') ? 'Choose file or drag here (Optional)' : 'Choose file or drag here';
                span.style.color = 'var(--text-light)';
                span.style.fontWeight = 'normal';
            });
        } else {
            throw new Error(response.data.message || 'Form submission failed.');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Form submission error:', error);
        
        if (error.response) {
            // Server error
            showError(error.response.data.message || 'Server error occurred. Please try again.');
        } else if (error.message) {
            // Validation error
            showError(error.message);
        } else {
            // Network error
            showError('Network error. Please check your connection and try again.');
        }
    }
}

// Load dashboard data
async function loadDashboardData() {
    // Prevent multiple loads
    if (dashboardLoaded) {
        return;
    }
    
    // Set loading flag immediately to prevent concurrent calls
    dashboardLoaded = true;
    
    try {
        // Load statistics
        const statsResponse = await axios.get('/api/admin/stats');
        if (statsResponse.data.success) {
            updateStatistics(statsResponse.data.data);
        }
        
        // Load registrations
        const registrationsResponse = await axios.get('/api/admin/registrations');
        if (registrationsResponse.data.success) {
            currentRegistrations = registrationsResponse.data.data;
            updateRegistrationsTable(currentRegistrations);
        }
        
    } catch (error) {
        console.error('Dashboard data loading error:', error);
        // Use mock data for development
        updateStatistics({
            total: 0,
            committeeStats: {
                'UNSC': 0,
                'UNODC': 0,
                'LOK SABHA': 0,
                'CCC': 0,
                'IPC': 0,
                'DISEC': 0
            },
            positionStats: {
                'Chairperson': 0,
                'Vice-Chairperson': 0,
                'Director': 0
            },
            yearStats: {
                '1': 0,
                '2': 0,
                '3': 0,
                '4': 0,
                '5': 0
            },
            recentSubmissions: []
        });
        updateRegistrationsTable([]);
    }
}

// Update statistics
function updateStatistics(stats) {
    // Prevent multiple calls
    if (!stats || typeof stats !== 'object') {
        console.warn('Invalid stats data provided to updateStatistics');
        return;
    }
    
    // Update total registrations
    const totalElement = document.getElementById('totalRegistrations');
    if (totalElement) {
        totalElement.textContent = stats.total || 0;
    }
    
    // Update today's registrations
    const todayElement = document.getElementById('todayRegistrations');
    if (todayElement) {
        const today = new Date().toDateString();
        const todayCount = stats.recentSubmissions ? 
            stats.recentSubmissions.filter(sub => 
                new Date(sub.submittedAt).toDateString() === today
            ).length : 0;
        todayElement.textContent = todayCount;
    }
    
    // Update weekly registrations
    const weeklyElement = document.getElementById('weeklyRegistrations');
    if (weeklyElement) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyCount = stats.recentSubmissions ? 
            stats.recentSubmissions.filter(sub => 
                new Date(sub.submittedAt) >= weekAgo
            ).length : 0;
        weeklyElement.textContent = weeklyCount;
    }
}



// Update registrations table
function updateRegistrationsTable(registrations) {
    const tbody = document.querySelector('#registrationsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (registrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No registrations found</td></tr>';
        return;
    }
    
    registrations.forEach(reg => {
        const row = document.createElement('tr');
        // Get status with proper styling
        const status = reg.status || 'pending';
        const statusClass = status === 'approved' ? 'status-approved' : 
                           status === 'rejected' ? 'status-rejected' : 'status-pending';
        
        row.innerHTML = `
            <td>${reg.name || 'N/A'}</td>
            <td>${reg.email || 'N/A'}</td>
            <td>${reg.phone || 'N/A'}</td>
            <td>${reg.year || 'N/A'}</td>
            <td>${Array.isArray(reg.committees) ? reg.committees.join(', ') : 'N/A'}</td>
            <td>${Array.isArray(reg.positions) ? reg.positions.join(', ') : 'N/A'}</td>
            <td>${reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString() : 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            <td>
                <button class="btn btn-outline view-btn" data-registration-id="${reg.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline delete-btn" data-registration-id="${reg.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Page-specific initialization
function initializePage() {
    const path = window.location.pathname;
    
    if (path === '/admin') {
        // Admin page - initialize OTP authentication
        initializeOTPAuth();
    }
}

// Tab switching
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    elements.tabBtns.forEach(btn => btn.classList.remove('active'));
    elements.tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredRegistrations = currentRegistrations.filter(reg => 
        reg.name?.toLowerCase().includes(searchTerm) ||
        reg.email?.toLowerCase().includes(searchTerm) ||
        reg.phone?.includes(searchTerm) ||
        reg.college?.toLowerCase().includes(searchTerm)
    );
    updateRegistrationsTable(filteredRegistrations);
}

// Filter functionality
function handleFilter() {
    const committeeFilter = elements.committeeFilter?.value || '';
    const positionFilter = elements.positionFilter?.value || '';
    
    let filteredRegistrations = currentRegistrations;
    
    if (committeeFilter) {
        filteredRegistrations = filteredRegistrations.filter(reg => 
            Array.isArray(reg.committees) && reg.committees.includes(committeeFilter)
        );
    }
    
    if (positionFilter) {
        filteredRegistrations = filteredRegistrations.filter(reg => 
            Array.isArray(reg.positions) && reg.positions.includes(positionFilter)
        );
    }
    
    updateRegistrationsTable(filteredRegistrations);
}

// Handle mailer tab change
function handleMailerTabChange(event) {
    const clickedTab = event.currentTarget;
    const recipientType = clickedTab.dataset.recipientType;
    
    // Update active tab
    document.querySelectorAll('.mailer-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    clickedTab.classList.add('active');
    
    // Show/hide appropriate sections
    const recipientsGroup = document.getElementById('recipientsGroup');
    const singleEmailGroup = document.getElementById('singleEmailGroup');
    
    if (recipientType === 'single') {
        recipientsGroup.style.display = 'none';
        singleEmailGroup.style.display = 'block';
    } else {
        recipientsGroup.style.display = 'block';
        singleEmailGroup.style.display = 'none';
    }
}

// Preview functionality
function handlePreview() {
    const subject = elements.mailerForm?.querySelector('#subject')?.value || '';
    const message = elements.mailerForm?.querySelector('#message')?.value || '';
    const activeTab = document.querySelector('.mailer-tab-btn.active');
    const recipientType = activeTab?.dataset.recipientType;
    
    if (!subject || !message) {
        showError('Please fill in both subject and message before previewing.');
        return;
    }
    
    // Determine recipients
    let recipients = '';
    if (recipientType === 'single') {
        const singleEmail = document.getElementById('singleEmail')?.value || '';
        if (!singleEmail) {
            showError('Please enter an email address for single recipient.');
            return;
        }
        recipients = singleEmail;
    } else {
        const selectedRecipients = Array.from(document.querySelectorAll('#recipients option:checked')).map(opt => opt.value);
        if (selectedRecipients.length === 0) {
            showError('Please select at least one recipient group.');
            return;
        }
        recipients = selectedRecipients.join(', ');
    }
    
    // Show email preview modal
    showEmailPreviewModal(subject, message, recipients);
}

// Show email preview modal
function showEmailPreviewModal(subject, message, recipients) {
    const modal = document.getElementById('emailPreviewModal');
    const previewSubject = document.getElementById('previewSubject');
    const previewTo = document.getElementById('previewTo');
    const previewBody = document.getElementById('previewBody');
    
    previewSubject.textContent = subject;
    previewTo.textContent = recipients;
    
    // Create email HTML content
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #172d9d 0%, #797dfa 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">KMUN'25</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Executive Board Recruitment</p>
            </div>
            <div style="padding: 30px; background: #ffffff;">
                ${message.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;
    
    previewBody.innerHTML = emailHtml;
    modal.style.display = 'flex';
}

// Hide email preview modal
function hideEmailPreviewModal() {
    const modal = document.getElementById('emailPreviewModal');
    modal.style.display = 'none';
}

// Send email from preview
async function sendEmailFromPreview() {
    try {
        showLoading();
        
        // Create request data object (same as handleMailerSubmission)
        const requestData = {};
        
        const activeTab = document.querySelector('.mailer-tab-btn.active');
        const recipientType = activeTab?.dataset.recipientType;
        const emailProvider = document.getElementById('emailProvider')?.value;
        const subject = document.getElementById('subject')?.value;
        const message = document.getElementById('message')?.value;
        
        // Handle recipients based on type
        if (recipientType === 'single') {
            const singleEmail = document.getElementById('singleEmail')?.value;
            requestData.recipients = singleEmail;
        } else {
            const selectedRecipients = Array.from(document.querySelectorAll('#recipients option:checked')).map(opt => opt.value);
            requestData.recipients = selectedRecipients;
        }
        
        // Add other form data
        requestData.subject = subject;
        requestData.message = message;
        requestData.smtpProvider = emailProvider;
        
        const response = await axios.post('/api/admin/send-mail', requestData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            showSuccess('Email sent successfully!');
            elements.mailerForm.reset();
            hideEmailPreviewModal();
            
            // Reset to first tab
            const firstTab = document.querySelector('.mailer-tab-btn');
            if (firstTab) {
                firstTab.click();
            }
        } else {
            throw new Error(response.data.message || 'Failed to send email.');
        }
        
    } catch (error) {
        console.error('Mailer error:', error);
        showError(error.response?.data?.message || 'Failed to send email.');
    } finally {
        hideLoading();
    }
}

// Export to Excel
function exportToExcel() {
    if (currentRegistrations.length === 0) {
        showError('No data to export.');
        return;
    }
    
    try {
    const worksheet = XLSX.utils.json_to_sheet(currentRegistrations.map(reg => ({
            Name: reg.name || 'N/A',
            Email: reg.email || 'N/A',
            Phone: reg.phone || 'N/A',
            College: reg.college || 'N/A',
            Department: reg.department || 'N/A',
            Year: reg.year || 'N/A',
            'MUNs Participated': reg.munsParticipated || 'N/A',
            'MUNs with Awards': reg.munsWithAwards || 'N/A',
            'Organizing Experience': reg.organizingExperience || 'N/A',
            'MUNs Chaired': reg.munsChaired || 'N/A',
            Committees: Array.isArray(reg.committees) ? reg.committees.join(', ') : 'N/A',
            Positions: Array.isArray(reg.positions) ? reg.positions.join(', ') : 'N/A',
            'Submitted At': reg.submittedAt ? new Date(reg.submittedAt).toLocaleString() : 'N/A'
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    
        XLSX.writeFile(workbook, `Kumaraguru_MUN_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showSuccess('Data exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export data.');
    }
}

// Mailer submission
async function handleMailerSubmission(event) {
    event.preventDefault();
    
    try {
        showLoading();
        
        // Create request data object
        const requestData = {};
        
        // Get form data
        const activeTab = document.querySelector('.mailer-tab-btn.active');
        const recipientType = activeTab?.dataset.recipientType;
        const emailProvider = document.getElementById('emailProvider')?.value;
        const subject = document.getElementById('subject')?.value;
        const message = document.getElementById('message')?.value;
        
        // Validate required fields
        if (!subject || !message) {
            showError('Please fill in both subject and message.');
            return;
        }
        
        // Handle recipients based on type
        if (recipientType === 'single') {
            const singleEmail = document.getElementById('singleEmail')?.value;
            if (!singleEmail) {
                showError('Please enter an email address for single recipient.');
                return;
            }
            requestData.recipients = singleEmail;
        } else {
            const selectedRecipients = Array.from(document.querySelectorAll('#recipients option:checked')).map(opt => opt.value);
            if (selectedRecipients.length === 0) {
                showError('Please select at least one recipient group.');
                return;
            }
            requestData.recipients = selectedRecipients;
        }
        
        // Add other form data
        requestData.subject = subject;
        requestData.message = message;
        requestData.smtpProvider = emailProvider;
        
        // Handle attachments
        const attachmentFiles = document.getElementById('attachments')?.files;
        if (attachmentFiles && attachmentFiles.length > 0) {
            requestData.attachments = attachmentFiles;
        }
        

        
        // Create FormData for file uploads
        const formData = new FormData();
        
        // Add basic form data
        formData.append('recipients', JSON.stringify(requestData.recipients));
        formData.append('subject', requestData.subject);
        formData.append('message', requestData.message);
        formData.append('smtpProvider', requestData.smtpProvider);
        
        // Add attachments if any
        if (requestData.attachments) {
            for (let i = 0; i < requestData.attachments.length; i++) {
                formData.append('attachments', requestData.attachments[i]);
            }
        }
        
        const response = await axios.post('/api/admin/send-mail', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data.success) {
            showSuccess('Email sent successfully!');
            elements.mailerForm.reset();
            
            // Reset file list
            const fileList = document.getElementById('fileList');
            if (fileList) {
                fileList.innerHTML = '';
            }
            
            // Reset custom dropdown
            resetCustomDropdown();
            
            // Reset to first tab
            const firstTab = document.querySelector('.mailer-tab-btn');
            if (firstTab) {
                firstTab.click();
            }
        } else {
            throw new Error(response.data.message || 'Failed to send email.');
        }
        
    } catch (error) {
        console.error('Mailer error:', error);
        showError(error.response?.data?.message || 'Failed to send email.');
    } finally {
        hideLoading();
    }
}

// Utility functions
function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function showSuccessModal() {
    elements.successModal.style.display = 'flex';
}

function hideSuccessModal() {
    elements.successModal.style.display = 'none';
    // Redirect to home page
    window.location.href = '/';
}

function hideFileLinksModal() {
    elements.fileLinksModal.style.display = 'none';
    currentRegistration = null;
}

// Helper function to get file extension with improved detection
function getFileExtension(fileName, url) {
    // First, try to get extension from the original filename
    if (fileName && fileName.includes('.')) {
        const extension = fileName.split('.').pop().toLowerCase();
        if (extension && extension.length <= 4) { // Valid file extensions are usually 1-4 characters
            return extension;
        }
    }
    
    // If no valid extension in filename, try to extract from URL
    if (url && url.includes('.')) {
        const urlExtension = url.split('.').pop().toLowerCase();
        if (urlExtension && urlExtension.length <= 4) {
            return urlExtension;
        }
    }
    
    // For Cloudinary URLs, try to detect file type from the URL path
    if (url && url.includes('cloudinary.com')) {
        // Check if it's a raw upload (likely PDF or document)
        if (url.includes('/raw/upload/')) {
            // If the original filename suggests it's a PDF, return pdf
            if (fileName && fileName.toLowerCase().includes('.pdf')) {
                return 'pdf';
            }
            // Check for common document names that are typically PDFs
            if (fileName && /(id.?card|mun.?certificates?|chairing.?resume|resume|certificate)/i.test(fileName)) {
                return 'pdf';
            }
            // If the original filename suggests it's an image, try to detect
            if (fileName && /\.(jpg|jpeg|png|gif)$/i.test(fileName)) {
                const imgExtension = fileName.split('.').pop().toLowerCase();
                return imgExtension;
            }
        }
        // Check if it's an image upload
        else         if (url.includes('/image/upload/')) {
            return 'jpg'; // Default to jpg for image uploads
        }
    }
    
    // Default fallback
    return 'unknown';
}

// Function to view file in modal
function viewFileInModal(url, fileName) {
    const decodedUrl = decodeURIComponent(url);
    
    // Improved file type detection
    const fileExtension = getFileExtension(fileName, decodedUrl);
    
    const modal = document.getElementById('fileViewerModal');
    const title = document.getElementById('fileViewerTitle');
    const content = document.getElementById('fileViewerContent');
    
    title.textContent = `Viewing: ${fileName}`;
    
    // Note: URL accessibility test removed to avoid CSP violations
    // The iframe will handle loading errors gracefully
    
    // Create content based on file type
    if (['pdf'].includes(fileExtension)) {
        // For PDFs, try multiple viewing approaches
        content.innerHTML = `
            <div class="pdf-viewer">
                <div class="pdf-iframe-container">
                    <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(decodedUrl)}&embedded=true" 
                            width="100%" height="100%" frameborder="0"
                            style="border: 1px solid #ddd;"
                            onload="" 
                            onerror="">
                        <p>Google Docs viewer not available. <a href="${decodedUrl}" target="_blank">Click here to open the PDF</a></p>
                    </iframe>
                </div>
            </div>
        `;
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        // For images, display directly
        content.innerHTML = `
            <div class="image-viewer">
                <img src="${decodedUrl}" alt="${fileName}" style="max-width: 100%; height: auto;">
            </div>
        `;
    } else if (['txt'].includes(fileExtension)) {
        // For text files, fetch and display content
        fetch(decodedUrl)
            .then(response => response.text())
            .then(text => {
                content.innerHTML = `
                    <div class="text-viewer">
                        <pre style="white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 1rem; border-radius: 4px; max-height: 500px; overflow-y: auto;">${text}</pre>
                    </div>
                `;
            })
            .catch(error => {
                content.innerHTML = `
                    <div class="error-viewer">
                        <p>Unable to load text file. <a href="${decodedUrl}" target="_blank">Click here to download</a></p>
                    </div>
                `;
            });
    } else {
        // For other file types, show download link
        content.innerHTML = `
            <div class="download-viewer">
                <p>This file type cannot be previewed in the browser.</p>
                <a href="${decodedUrl}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-download"></i>
                    Download File
                </a>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

// Function to hide file viewer modal
function hideFileViewerModal() {
    const modal = document.getElementById('fileViewerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}



// Function to download file with proper filename
function downloadFile(url, fileName) {
    
    // Ensure the filename has the proper extension
    let downloadFileName = fileName;
    if (!downloadFileName.includes('.')) {
        // If no extension, try to determine from URL or add default
        if (url.includes('cloudinary.com') && url.includes('/raw/upload/')) {
            downloadFileName += '.pdf'; // Default to PDF for raw uploads
        }
    }
    
    // Try the blob download method first
    if (url.includes('cloudinary.com')) {
        // Add a timestamp to prevent caching issues
        const urlWithTimestamp = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        
        fetch(urlWithTimestamp)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                // Create a blob URL
                const blobUrl = window.URL.createObjectURL(blob);
                
                // Create a temporary anchor element
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = downloadFileName;
                
                // Append to body, click, and remove
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the blob URL
                setTimeout(() => {
                    window.URL.revokeObjectURL(blobUrl);
                }, 1000);
            })
            .catch(error => {
                console.error('Blob download failed:', error);
                // Fallback to direct download
                const link = document.createElement('a');
                link.href = url;
                link.download = downloadFileName;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    } else {
        // For non-Cloudinary URLs, use direct download
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Function to open files in new tab
function openFileInNewTab(url, fileName) {
    // Decode the URL since we encoded it in the onclick handler
    const decodedUrl = decodeURIComponent(url);
    
    try {
        // Improved file type detection
        const fileExtension = getFileExtension(fileName, decodedUrl);
        
        // For PDFs, images, and text files, try to open in browser
        if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'].includes(fileExtension) || 
            decodedUrl.includes('cloudinary.com')) {
            
            // Create a new window/tab with the file
            const newWindow = window.open(decodedUrl, '_blank');
            
            // If the window was blocked, show a message
            if (!newWindow) {
                showError('Popup blocked. Please allow popups for this site and try again.');
            } else {
                // Add a small delay to check if the window loaded successfully
                setTimeout(() => {
                    if (newWindow.closed) {
                        showError('Unable to open file in browser. The file may have been blocked or is not supported.');
                    }
                }, 1000);
            }
        } else {
            // For other file types (doc, docx, etc.), show a message
            showError(`This file type (${fileExtension}) may not be viewable in the browser. It will be downloaded instead.`);
            window.open(decodedUrl, '_blank');
        }
    } catch (error) {
        console.error('Error opening file:', error);
        showError('Error opening file. Please try again.');
    }
}

// Show view mode
function showViewMode() {
    elements.modalTitle.textContent = 'Registration Details';
    elements.registrationDetailsContent.style.display = 'block';
    elements.registrationEditContent.style.display = 'none';
    elements.editBtn.style.display = 'inline-flex';
    elements.saveBtn.style.display = 'none';
    elements.cancelBtn.style.display = 'none';
    elements.closeFileLinksModal.style.display = 'inline-flex';
}

// Show edit mode
function showEditMode() {
    elements.modalTitle.textContent = 'Edit Registration';
    elements.registrationDetailsContent.style.display = 'none';
    elements.registrationEditContent.style.display = 'block';
    elements.editBtn.style.display = 'none';
    elements.saveBtn.style.display = 'inline-flex';
    elements.cancelBtn.style.display = 'inline-flex';
    elements.closeFileLinksModal.style.display = 'none';
}

// Start edit mode
function startEditMode() {
    if (!currentRegistration) return;
    
    // Generate edit form HTML
    const editHTML = generateEditFormHTML(currentRegistration);
    elements.registrationEditContent.innerHTML = editHTML;
    
    showEditMode();
}

// Cancel edit mode
function cancelEditMode() {
    showViewMode();
}

// Save registration changes
async function saveRegistration() {
    try {
        if (!currentRegistration) return;
        
        // Collect form data
        const formData = collectEditFormData();
        
        if (!formData) {
            showError('Please fill in all required fields');
            return;
        }
        
        showLoading();
        
        // Update registration in database
        const response = await axios.put(`/api/admin/registrations/${currentRegistration.id}`, formData);
        
        if (response.data.success) {
            // Update local data
            const index = currentRegistrations.findIndex(reg => reg.id === currentRegistration.id);
            if (index !== -1) {
                currentRegistrations[index] = { ...currentRegistration, ...formData };
                currentRegistration = currentRegistrations[index];
            }
            
            // Regenerate view HTML
            const detailsHTML = generateRegistrationDetailsHTML(currentRegistration);
            elements.registrationDetailsContent.innerHTML = detailsHTML;
            
            showViewMode();
            
            await Swal.fire({
                title: 'Success!',
                text: 'Registration updated successfully.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } else {
            throw new Error(response.data.message || 'Failed to update registration');
        }
        
    } catch (error) {
        console.error('Error saving registration:', error);
        
        await Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to save changes',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    } finally {
        hideLoading();
    }
}

function showSuccess(message) {
    // Create a simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    // Create a simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}



// Table action handler
function handleTableAction(event) {
    const target = event.target;
    
    // Check if the clicked element is a button or its child
    const button = target.closest('.view-btn, .delete-btn');
    if (!button) return;
    
    const registrationId = button.dataset.registrationId;
    if (!registrationId) return;
    
    // Determine which action to perform based on the button class
    if (button.classList.contains('view-btn')) {
        viewRegistration(registrationId);
    } else if (button.classList.contains('delete-btn')) {
        deleteRegistration(registrationId);
    }
}

// File link actions handler
function handleFileLinkActions(event) {
    const target = event.target;
    
    // Handle "View in Browser" clicks
    const viewModalBtn = target.closest('.file-view-modal');
    if (viewModalBtn) {
        event.preventDefault();
        const url = viewModalBtn.dataset.url;
        const filename = viewModalBtn.dataset.filename;
        if (url && filename) {
            viewFileInModal(url, filename);
        }
        return;
    }
}

// Handle multi-select and file removal actions
function handleMultiSelectActions(event) {
    const target = event.target;
    
    // Handle chip removal
    const removeChipBtn = target.closest('.remove-chip-btn');
    if (removeChipBtn) {
        const value = removeChipBtn.dataset.value;
        if (value) {
            const checkbox = document.querySelector(`#recipientsOptions .option-item[data-value="${value}"] input[type="checkbox"]`);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }
        }
        return;
    }
    
    // Handle file removal
    const removeFileBtn = target.closest('.remove-file-btn');
    if (removeFileBtn) {
        const index = parseInt(removeFileBtn.dataset.index);
        if (!isNaN(index)) {
            removeFile(index);
        }
        return;
    }
}

// Global variable to store current registration being viewed/edited
let currentRegistration = null;

// Admin functions
async function viewRegistration(id) {
    try {
        showLoading();
        
        // Find the registration in current data
        const registration = currentRegistrations.find(reg => reg.id === id);
        
        if (!registration) {
            throw new Error('Registration not found');
        }
        
        // Store current registration
        currentRegistration = registration;
        
        // Generate complete registration details HTML
        const detailsHTML = generateRegistrationDetailsHTML(registration);
        elements.registrationDetailsContent.innerHTML = detailsHTML;
        
        // Show view mode
        showViewMode();
        
        // Show the modal
        elements.fileLinksModal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error viewing registration:', error);
        showError('Failed to load registration details');
    } finally {
        hideLoading();
    }
}

// Generate HTML for complete registration details
function generateRegistrationDetailsHTML(registration) {
    // Helper function to format committees and positions
    const formatArray = (arr) => {
        if (!arr) return [];
        if (Array.isArray(arr)) return arr;
        try {
            return JSON.parse(arr);
        } catch {
            return [arr];
        }
    };
    
    const committees = formatArray(registration.committees);
    const positions = formatArray(registration.positions);
    
    // Generate file links
    const fileLinks = [];
    
    // Helper function to convert Cloudinary URLs to viewer URLs
    const getViewerUrl = (url) => {
        if (!url) return url;
        
        // For Cloudinary URLs, ensure they open in browser instead of downloading
        if (url.includes('cloudinary.com')) {
            let modifiedUrl = url;
            
            // Remove any fl_attachment parameter to prevent forced download
            modifiedUrl = modifiedUrl.replace(/[?&]fl_attachment[^&]*/g, '');
            
            // For PDFs and raw uploads, ensure they can be viewed inline
            if (url.includes('.pdf') || url.includes('/raw/upload/')) {
                // Don't add any parameters that might interfere with iframe loading
                // The raw upload should work fine without additional parameters
            }
            
            // For images, ensure they're served as images
            if (url.includes('/image/upload/')) {
                const separator = modifiedUrl.includes('?') ? '&' : '?';
                modifiedUrl += `${separator}f_auto`;
            }
            
            return modifiedUrl;
        }
        return url;
    };
    
    if (registration.idCardUrl) {
        fileLinks.push({
            name: registration.idCardFilename || 'ID Card.pdf',
            url: getViewerUrl(registration.idCardUrl),
            icon: 'fas fa-id-card'
        });
    }
    
    if (registration.munCertificatesUrl) {
        fileLinks.push({
            name: registration.munCertificatesFilename || 'MUN Certificates.pdf',
            url: getViewerUrl(registration.munCertificatesUrl),
            icon: 'fas fa-certificate'
        });
    }
    
    if (registration.chairingResumeUrl) {
        fileLinks.push({
            name: registration.chairingResumeFilename || 'Chairing Resume.pdf',
            url: getViewerUrl(registration.chairingResumeUrl),
            icon: 'fas fa-file-alt'
        });
    }
    
    // Check for files object (for backward compatibility)
    if (registration.files && typeof registration.files === 'object') {
        Object.entries(registration.files).forEach(([key, url]) => {
            if (url && typeof url === 'string') {
                const name = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                fileLinks.push({
                    name: name,
                    url: getViewerUrl(url),
                    icon: 'fas fa-file'
                });
            }
        });
    }
    
    return `
        <!-- Personal Information -->
        <div class="registration-section">
            <h4><i class="fas fa-user"></i> Personal Information</h4>
            <div class="registration-grid">
                <div class="registration-field">
                    <label>Full Name</label>
                    <div class="value">${registration.name || '<span class="empty">Not provided</span>'}</div>
                </div>
                <div class="registration-field">
                    <label>Email Address</label>
                    <div class="value">${registration.email || '<span class="empty">Not provided</span>'}</div>
                </div>
                <div class="registration-field">
                    <label>Phone Number</label>
                    <div class="value">${registration.phone || '<span class="empty">Not provided</span>'}</div>
                </div>
                <div class="registration-field">
                    <label>College</label>
                    <div class="value">${registration.college || '<span class="empty">Not provided</span>'}</div>
                </div>
                <div class="registration-field">
                    <label>Department</label>
                    <div class="value">${registration.department || '<span class="empty">Not provided</span>'}</div>
                </div>
                <div class="registration-field">
                    <label>Year of Study</label>
                    <div class="value">${registration.year || '<span class="empty">Not provided</span>'}</div>
                </div>
            </div>
        </div>

        <!-- MUN Experience -->
        <div class="registration-section">
            <h4><i class="fas fa-trophy"></i> MUN Experience</h4>
            <div class="registration-grid">
                <div class="registration-field">
                    <label>MUNs Participated</label>
                    <div class="value">${registration.munsParticipated || 0}</div>
                </div>
                <div class="registration-field">
                    <label>MUNs with Awards</label>
                    <div class="value">${registration.munsWithAwards || 0}</div>
                </div>
                <div class="registration-field">
                    <label>MUNs Chaired</label>
                    <div class="value">${registration.munsChaired || 0}</div>
                </div>
                <div class="registration-field">
                    <label>Organizing Experience</label>
                    <div class="value">${registration.organizingExperience || '<span class="empty">Not provided</span>'}</div>
                </div>
            </div>
        </div>

        <!-- Preferences -->
        <div class="registration-section">
            <h4><i class="fas fa-list-check"></i> Committee & Position Preferences</h4>
            <div class="registration-grid">
                <div class="registration-field">
                    <label>Committee Preferences</label>
                    <div class="value">
                        ${committees.length > 0 ? 
                            `<div class="committees-list">
                                ${committees.map(committee => `<span class="committee-tag">${committee}</span>`).join('')}
                            </div>` : 
                            '<span class="empty">No committees selected</span>'
                        }
                    </div>
                </div>
                <div class="registration-field">
                    <label>Position Preferences</label>
                    <div class="value">
                        ${positions.length > 0 ? 
                            `<div class="positions-list">
                                ${positions.map(position => `<span class="position-tag">${position}</span>`).join('')}
                            </div>` : 
                            '<span class="empty">No positions selected</span>'
                        }
                    </div>
                </div>
            </div>
        </div>

        <!-- Submission Details -->
        <div class="registration-section">
            <h4><i class="fas fa-clock"></i> Submission Details</h4>
            <div class="registration-grid">
                <div class="registration-field">
                    <label>Submitted At</label>
                    <div class="value">${registration.submittedAt ? new Date(registration.submittedAt).toLocaleString() : '<span class="empty">Not available</span>'}</div>
                </div>
                <div class="registration-field">
                    <label>Status</label>
                    <div class="value">${registration.status || 'pending'}</div>
                </div>
            </div>
        </div>

        <!-- Uploaded Files -->
        <div class="registration-section file-links-section">
            <h4><i class="fas fa-file-alt"></i> Uploaded Files</h4>
            <div class="file-links-list">
                ${fileLinks.length > 0 ? 
                    fileLinks.map(file => `
                        <div class="file-link-item">
                            <div class="file-link-header">
                                <i class="${file.icon}"></i>
                                <h5>${file.name}</h5>
                            </div>
                            <div class="file-link-actions">
                                <button class="btn btn-outline btn-sm file-view-modal" data-url="${encodeURIComponent(file.url)}" data-filename="${file.name.replace(/"/g, '&quot;')}">
                                    <i class="fas fa-eye"></i>
                                    View in Browser
                                </button>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="no-files-message">No files uploaded for this registration.</div>'
                }
            </div>
        </div>
    `;
}

// Generate HTML for edit form
function generateEditFormHTML(registration) {
    const formatArray = (arr) => {
        if (!arr) return [];
        if (Array.isArray(arr)) return arr;
        try {
            return JSON.parse(arr);
        } catch {
            return [arr];
        }
    };
    
    const committees = formatArray(registration.committees);
    const positions = formatArray(registration.positions);
    
    return `
        <form id="editRegistrationForm">
            <!-- Personal Information -->
            <div class="registration-section">
                <h4><i class="fas fa-user"></i> Personal Information</h4>
                <div class="registration-grid">
                    <div class="form-group">
                        <label for="editName">Full Name *</label>
                        <input type="text" id="editName" name="name" value="${registration.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email Address *</label>
                        <input type="email" id="editEmail" name="email" value="${registration.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">Phone Number *</label>
                        <input type="tel" id="editPhone" name="phone" value="${registration.phone || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCollege">College *</label>
                        <input type="text" id="editCollege" name="college" value="${registration.college || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editDepartment">Department *</label>
                        <input type="text" id="editDepartment" name="department" value="${registration.department || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editYear">Year of Study *</label>
                        <input type="number" id="editYear" name="year" value="${registration.year || ''}" min="1" max="4" required>
                    </div>
                </div>
            </div>

            <!-- MUN Experience -->
            <div class="registration-section">
                <h4><i class="fas fa-trophy"></i> MUN Experience</h4>
                <div class="registration-grid">
                    <div class="form-group">
                        <label for="editMunsParticipated">MUNs Participated</label>
                        <input type="number" id="editMunsParticipated" name="munsParticipated" value="${registration.munsParticipated || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label for="editMunsWithAwards">MUNs with Awards</label>
                        <input type="number" id="editMunsWithAwards" name="munsWithAwards" value="${registration.munsWithAwards || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label for="editMunsChaired">MUNs Chaired</label>
                        <input type="number" id="editMunsChaired" name="munsChaired" value="${registration.munsChaired || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label for="editOrganizingExperience">Organizing Experience</label>
                        <textarea id="editOrganizingExperience" name="organizingExperience" rows="3">${registration.organizingExperience || ''}</textarea>
                    </div>
                </div>
            </div>

            <!-- Preferences -->
            <div class="registration-section">
                <h4><i class="fas fa-list-check"></i> Committee & Position Preferences</h4>
                <div class="registration-grid">
                    <div class="form-group">
                        <label>Committee Preferences *</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item">
                                <input type="checkbox" name="committees" value="UNSC" ${committees.includes('UNSC') ? 'checked' : ''}>
                                <span>UNSC</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="committees" value="UNODC" ${committees.includes('UNODC') ? 'checked' : ''}>
                                <span>UNODC</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="committees" value="LOK SABHA" ${committees.includes('LOK SABHA') ? 'checked' : ''}>
                                <span>LOK SABHA</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="committees" value="CCC" ${committees.includes('CCC') ? 'checked' : ''}>
                                <span>CCC</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="committees" value="IPC" ${committees.includes('IPC') ? 'checked' : ''}>
                                <span>IPC</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="committees" value="DISEC" ${committees.includes('DISEC') ? 'checked' : ''}>
                                <span>DISEC</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Position Preferences *</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item">
                                <input type="checkbox" name="positions" value="Chairperson" ${positions.includes('Chairperson') ? 'checked' : ''}>
                                <span>Chairperson</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="positions" value="Vice-Chairperson" ${positions.includes('Vice-Chairperson') ? 'checked' : ''}>
                                <span>Vice-Chairperson</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="positions" value="Director" ${positions.includes('Director') ? 'checked' : ''}>
                                <span>Director</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Status -->
            <div class="registration-section">
                <h4><i class="fas fa-info-circle"></i> Status</h4>
                <div class="registration-grid">
                    <div class="form-group">
                        <label for="editStatus">Status</label>
                        <select id="editStatus" name="status">
                            <option value="pending" ${registration.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${registration.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${registration.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Note: Files cannot be edited -->
            <div class="registration-section">
                <h4><i class="fas fa-file-alt"></i> Uploaded Files</h4>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Note:</strong> Uploaded files cannot be edited. Files are managed separately.
                </div>
            </div>
        </form>
    `;
}

// Collect form data from edit form
function collectEditFormData() {
    const form = document.getElementById('editRegistrationForm');
    if (!form) return null;
    
    const formData = new FormData(form);
    const data = {};
    
    // Collect basic fields
    for (const [key, value] of formData.entries()) {
        if (key === 'committees' || key === 'positions') {
            if (!data[key]) data[key] = [];
            data[key].push(value);
        } else {
            data[key] = value;
        }
    }
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'college', 'department', 'year'];
    for (const field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            return null;
        }
    }
    
    // Validate committees and positions
    if (!data.committees || data.committees.length === 0) {
        return null;
    }
    if (!data.positions || data.positions.length === 0) {
        return null;
    }
    
    // Convert numeric fields
    data.year = parseInt(data.year);
    data.munsParticipated = parseInt(data.munsParticipated) || 0;
    data.munsWithAwards = parseInt(data.munsWithAwards) || 0;
    data.munsChaired = parseInt(data.munsChaired) || 0;
    
    return data;
}

function editRegistration(id) {
    showSuccess(`Editing registration ${id}`);
}

async function deleteRegistration(id) {
    try {
        // Find the registration
        const registration = currentRegistrations.find(reg => reg.id === id);
        if (!registration) {
            showError('Registration not found');
            return;
        }

        // Show confirmation dialog with SweetAlert2
        const result = await Swal.fire({
            title: 'Delete Registration',
            text: `Are you sure you want to delete the registration for ${registration.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
            return;
        }



        // Proceed with deletion
        showLoading();
        const deleteResponse = await axios.delete(`/api/admin/registrations/${id}`);
        
        if (deleteResponse.data.success) {
            // Remove from local data
            const index = currentRegistrations.findIndex(reg => reg.id === id);
            if (index !== -1) {
                currentRegistrations.splice(index, 1);
            }
            
            // Update table
            updateRegistrationsTable(currentRegistrations);
            
            hideLoading();
            
            await Swal.fire({
                title: 'Deleted!',
                text: 'Registration has been deleted successfully.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } else {
            throw new Error(deleteResponse.data.message || 'Failed to delete registration');
        }

    } catch (error) {
        hideLoading();
        console.error('Error deleting registration:', error);
        
        await Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to delete registration',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

// Custom Multi-Select Dropdown Functionality
function initializeCustomMultiSelect() {
    const selectDisplay = document.getElementById('recipientsDisplay');
    const selectDropdown = document.getElementById('recipientsDropdown');
    const selectedItems = document.getElementById('selectedRecipients');
    const searchInput = document.getElementById('recipientsSearch');
    const optionsList = document.getElementById('recipientsOptions');
    const hiddenSelect = document.getElementById('recipients');
    
    let selectedValues = new Set();
    
    // Toggle dropdown
    selectDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = selectDropdown.classList.contains('active');
        
        if (isActive) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!selectDisplay.contains(e.target) && !selectDropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const optionItems = optionsList.querySelectorAll('.option-item');
        
        optionItems.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            if (label.includes(searchTerm)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
    
    // Handle option selection
    optionsList.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const optionItem = e.target.closest('.option-item');
            const value = optionItem.dataset.value;
            const label = optionItem.querySelector('label').textContent;
            
            if (e.target.checked) {
                selectedValues.add(value);
                optionItem.classList.add('selected');
                addChip(value, label);
            } else {
                selectedValues.delete(value);
                optionItem.classList.remove('selected');
                removeChip(value);
            }
            
            updateHiddenSelect();
        }
    });
    
    // Handle option item click (for better UX)
    optionsList.addEventListener('click', (e) => {
        const optionItem = e.target.closest('.option-item');
        if (optionItem && !e.target.matches('input[type="checkbox"]')) {
            const checkbox = optionItem.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    function openDropdown() {
        selectDropdown.classList.add('active');
        selectDisplay.classList.add('active');
        searchInput.focus();
    }
    
    function closeDropdown() {
        selectDropdown.classList.remove('active');
        selectDisplay.classList.remove('active');
        searchInput.value = '';
        // Reset search
        optionsList.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('hidden');
        });
    }
    
    function addChip(value, label) {
        const existingChip = selectedItems.querySelector(`[data-value="${value}"]`);
        if (existingChip) return;
        
        const chip = document.createElement('span');
        chip.className = 'selected-chip';
        chip.dataset.value = value;
        chip.innerHTML = `
            ${label}
            <span class="remove-chip remove-chip-btn" data-value="${value}">
                <i class="fas fa-times"></i>
            </span>
        `;
        
        // Remove placeholder if it exists
        const placeholder = selectedItems.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        selectedItems.appendChild(chip);
    }
    
    function removeChip(value) {
        const chip = selectedItems.querySelector(`[data-value="${value}"]`);
        if (chip) {
            chip.remove();
        }
        
        // Add placeholder if no chips left
        if (selectedValues.size === 0) {
            const placeholder = document.createElement('span');
            placeholder.className = 'placeholder';
            placeholder.textContent = 'Select recipients...';
            selectedItems.appendChild(placeholder);
        }
    }
    
    function updateHiddenSelect() {
        // Clear existing options
        hiddenSelect.innerHTML = '';
        
        // Add selected values
        selectedValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.selected = true;
            hiddenSelect.appendChild(option);
        });
    }
    

    
    // Function to reset the custom dropdown
    function resetCustomDropdown() {
        // Clear all selected values
        selectedValues.clear();
        
        // Uncheck all checkboxes
        optionsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Remove selected class from all options
        optionsList.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Clear chips and add placeholder
        selectedItems.innerHTML = '<span class="placeholder">Select recipients...</span>';
        
        // Update hidden select
        updateHiddenSelect();
        
        // Close dropdown if open
        closeDropdown();
    }
}

// File Upload Handling for Mailer
document.addEventListener('DOMContentLoaded', function() {
    const attachmentInput = document.getElementById('attachments');
    const fileList = document.getElementById('fileList');
    
    if (attachmentInput && fileList) {
        // Handle file selection
        attachmentInput.addEventListener('change', handleFileSelection);
        
        // Handle drag and drop
        const fileInputWrapper = attachmentInput.closest('.file-input-wrapper');
        if (fileInputWrapper) {
            fileInputWrapper.addEventListener('dragover', handleDragOver);
            fileInputWrapper.addEventListener('drop', handleDrop);
            fileInputWrapper.addEventListener('dragleave', handleDragLeave);
        }
    }
});

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    displaySelectedFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = 'var(--accent-1)';
    event.currentTarget.style.background = 'rgba(121, 125, 250, 0.05)';
}

function handleDrop(event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const attachmentInput = document.getElementById('attachments');
    
    // Filter files by accepted types
    const acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
    const filteredFiles = files.filter(file => {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return acceptedTypes.includes(extension);
    });
    
    // Add files to input
    const dataTransfer = new DataTransfer();
    const existingFiles = Array.from(attachmentInput.files);
    const allFiles = [...existingFiles, ...filteredFiles];
    
    // Limit to 5 files
    const limitedFiles = allFiles.slice(0, 5);
    
    limitedFiles.forEach(file => dataTransfer.items.add(file));
    attachmentInput.files = dataTransfer.files;
    
    displaySelectedFiles(limitedFiles);
    
    // Reset drag styling
    event.currentTarget.style.borderColor = '';
    event.currentTarget.style.background = '';
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '';
    event.currentTarget.style.background = '';
}

function displaySelectedFiles(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = createFileItem(file, index);
        fileList.appendChild(fileItem);
    });
}

function createFileItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const fileIcon = getFileIcon(file.name);
    const fileSize = formatFileSize(file.size);
    
    fileItem.innerHTML = `
        <div class="file-item-info">
            <div class="file-item-icon">
                <i class="${fileIcon}"></i>
            </div>
            <div class="file-item-details">
                <div class="file-item-name">${file.name}</div>
                <div class="file-item-size">${fileSize}</div>
            </div>
        </div>
        <button type="button" class="file-item-remove remove-file-btn" data-index="${index}">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    return fileItem;
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
        case 'pdf':
            return 'fas fa-file-pdf';
        case 'doc':
        case 'docx':
            return 'fas fa-file-word';
        case 'jpg':
        case 'jpeg':
        case 'png':
            return 'fas fa-file-image';
        case 'txt':
            return 'fas fa-file-alt';
        default:
            return 'fas fa-file';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile(index) {
    const attachmentInput = document.getElementById('attachments');
    const files = Array.from(attachmentInput.files);
    
    // Remove file at index
    files.splice(index, 1);
    
    // Update input files
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    attachmentInput.files = dataTransfer.files;
    
    // Update display
    displaySelectedFiles(files);
}

// OTP Authentication Functions
function initializeOTPAuth() {
    // Check if user is already authenticated
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
        try {
            otpSession = JSON.parse(savedSession);
            const now = new Date().getTime();
            
            if (otpSession.expiresAt > now) {
                showAdminDashboard();
                return;
            } else {
                localStorage.removeItem('adminSession');
            }
        } catch (error) {
            localStorage.removeItem('adminSession');
        }
    }
    
    showOTPLoginScreen();
}

function showOTPLoginScreen() {
    const otpScreen = document.getElementById('otpLoginScreen');
    const mainContent = document.querySelector('.main-content');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (otpScreen) otpScreen.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    // Initialize OTP event listeners
    initializeOTPEventListeners();
}

function showAdminDashboard() {
    const otpScreen = document.getElementById('otpLoginScreen');
    const mainContent = document.querySelector('.main-content');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (otpScreen) otpScreen.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    
    // Set up logout button event listener
    if (logoutBtn) {
        // Remove existing listener to prevent duplicates
        logoutBtn.removeEventListener('click', logout);
        logoutBtn.addEventListener('click', logout);
    }
    
    // Load dashboard data if not already loaded
    if (!dashboardLoaded) {
        loadDashboardData();
    }
}

function initializeOTPEventListeners() {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', sendOTP);
    }
    
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', verifyOTP);
    }
    
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', sendOTP);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Enter key support
    const adminEmail = document.getElementById('adminEmail');
    const otpCode = document.getElementById('otpCode');
    
    if (adminEmail) {
        adminEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendOTP();
            }
        });
    }
    
    if (otpCode) {
        otpCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyOTP();
            }
        });
    }
}

async function sendOTP() {
    const emailInput = document.getElementById('adminEmail');
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('Please enter your email address');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    try {
        showLoading();
        
        const response = await axios.post('/api/admin/otp', { action: 'send', email });
        
        if (response.data.success) {
            showSuccess('OTP sent successfully! Check your email.');
            
            // Show OTP verification form
            const otpForm = document.getElementById('otpVerificationForm');
            const loginForm = document.querySelector('.otp-login-form');
            
            if (otpForm) otpForm.style.display = 'block';
            if (loginForm) loginForm.style.display = 'none';
            
            // Focus on OTP input
            const otpInput = document.getElementById('otpCode');
            if (otpInput) otpInput.focus();
            
        } else {
            showError(response.data.message || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        
        // Show specific error message from server if available
        if (error.response && error.response.data && error.response.data.message) {
            showError(error.response.data.message);
        } else {
            showError('Failed to send OTP. Please try again.');
        }
    } finally {
        hideLoading();
    }
}

async function verifyOTP() {
    const emailInput = document.getElementById('adminEmail');
    const otpInput = document.getElementById('otpCode');
    const email = emailInput.value.trim();
    const otp = otpInput.value.trim();
    
    if (!otp) {
        showError('Please enter the OTP');
        return;
    }
    
    if (!otp.match(/^\d{6}$/)) {
        showError('Please enter a valid 6-digit OTP');
        return;
    }
    
    try {
        showLoading();
        
        const response = await axios.post('/api/admin/otp', { action: 'verify', email, otp });
        
        if (response.data.success) {
            // Create session
            otpSession = {
                email: email,
                expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000), // 24 hours
                token: response.data.token
            };
            
            // Save to localStorage
            localStorage.setItem('adminSession', JSON.stringify(otpSession));
            
            showSuccess('Authentication successful!');
            
            // Show admin dashboard
            setTimeout(() => {
                showAdminDashboard();
            }, 1000);
            
        } else {
            showError(response.data.message || 'Invalid OTP');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        
        // Show specific error message from server if available
        if (error.response && error.response.data && error.response.data.message) {
            showError(error.response.data.message);
        } else {
            showError('Failed to verify OTP. Please try again.');
        }
    } finally {
        hideLoading();
    }
}

function logout() {
    // Clear session
    otpSession = null;
    localStorage.removeItem('adminSession');
    
    // Reset dashboard loaded flag
    dashboardLoaded = false;
    
    // Show login screen
    showOTPLoginScreen();
    
    // Clear forms
    const emailInput = document.getElementById('adminEmail');
    const otpInput = document.getElementById('otpCode');
    const otpForm = document.getElementById('otpVerificationForm');
    const loginForm = document.querySelector('.otp-login-form');
    
    if (emailInput) emailInput.value = '';
    if (otpInput) otpInput.value = '';
    if (otpForm) otpForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    
    showSuccess('Logged out successfully');
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Toast Notification Functions
function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="${iconMap[type] || iconMap.info} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

// Update existing showSuccess and showError functions to use toast
function showSuccess(message) {
    showToast('success', 'Success', message);
}

function showError(message) {
    showToast('error', 'Error', message);
}

function showWarning(message) {
    showToast('warning', 'Warning', message);
}

function showInfo(message) {
    showToast('info', 'Info', message);
}