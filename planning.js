// Global state variables
let currentPlanSteps = [];
let isExecutingPlan = false;
let currentStepIndex = 0;

/**
 * Create and display a new planning section
 * @param {HTMLElement} messageElement - The parent message element
 * @param {Array} initialSteps - Optional initial planning steps
 * @returns {HTMLElement} - The created planning section element
 */
export function createPlanningSection(messageElement) {
    if (!messageElement) return null;
    
    // Create planning section container
    const planningSection = document.createElement('div');
    planningSection.className = 'planning-section';
    
    // Create planning header
    const headerSection = document.createElement('div');
    headerSection.className = 'planning-header';
    headerSection.innerHTML = `
        <div class="planning-title">
            <span class="planning-icon material-symbols-outlined">engineering</span>
            <span>Planning</span>
        </div>
        <div class="planning-thinking-text">Thinking...</div>
    `;
    
    // Create planning content
    const planningContent = document.createElement('div');
    planningContent.className = 'planning-content';
    
    // Create planning steps list
    const planningStepsList = document.createElement('ul');
    planningStepsList.className = 'planning-steps';
    planningContent.appendChild(planningStepsList);
    
    // Create planning controls
    const planningControls = document.createElement('div');
    planningControls.className = 'planning-controls';
    planningControls.innerHTML = `
        <button class="planning-edit-btn" style="display: none;">
            <span class="material-symbols-outlined">edit</span> Edit Plan
        </button>
        <button class="planning-approve-btn" style="display: none;">
            <span class="material-symbols-outlined">check_circle</span> Approve Plan
        </button>
        <button class="planning-add-step-btn" style="display: none;">
            <span class="material-symbols-outlined">add</span> Add Step
        </button>
    `;
    
    // Add status message area (hidden initially)
    const statusMessage = document.createElement('div');
    statusMessage.className = 'planning-status';
    statusMessage.style.display = 'none';
    
    // Build the planning section
    planningSection.appendChild(headerSection);
    planningSection.appendChild(planningContent);
    planningSection.appendChild(planningControls);
    planningSection.appendChild(statusMessage);
    
    // Add the planning section to the message
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
        messageContent.appendChild(planningSection);
    } else {
        messageElement.appendChild(planningSection);
    }
    
    return planningSection;
}

/**
 * Show thinking animation while AI is creating the plan
 * @param {HTMLElement} planningSection - The planning section element
 * @param {boolean} isThinking - Whether to show or hide the animation
 */
export function showPlanningThinking(planningSection, isThinking) {
    if (!planningSection) return;
    
    const thinkingText = planningSection.querySelector('.planning-thinking-text');
    if (thinkingText) {
        thinkingText.style.display = isThinking ? 'block' : 'none';
    }
}

/**
 * Add or update a step in the planning steps list with a fade-in animation
 * @param {HTMLElement} planningSection - The planning section element
 * @param {string} stepText - The text content of the step
 * @param {number} index - The index of the step (for updates)
 * @param {boolean} animate - Whether to animate the addition
 */
export function addPlanningStep(planningSection, stepText, index, animate = true) {
    if (!planningSection) return;
    
    const stepsList = planningSection.querySelector('.planning-steps');
    if (!stepsList) return;
    
    // Create new step item if index is not provided or out of bounds
    if (index === undefined || index < 0 || index >= stepsList.children.length) {
        const stepItem = document.createElement('li');
        stepItem.className = 'planning-step';
        
        // For animation
        if (animate) {
            stepItem.style.opacity = '0';
            stepItem.style.transform = 'translateY(10px)';
        }
        
        stepItem.innerHTML = `
            <div class="step-content">${stepText}</div>
            <div class="step-actions">
                <button class="step-edit-btn" title="Edit this step">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="step-delete-btn" title="Remove this step">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        
        stepsList.appendChild(stepItem);
        
        // Add to the current plan steps array
        currentPlanSteps.push(stepText);
        
        // Apply animation
        if (animate) {
            setTimeout(() => {
                stepItem.style.opacity = '1';
                stepItem.style.transform = 'translateY(0)';
            }, 50);
        }
        
        // Add event listeners to buttons
        setupStepEventListeners(stepItem, currentPlanSteps.length - 1);
        
    } else { // Update existing step
        const stepItem = stepsList.children[index];
        const stepContent = stepItem.querySelector('.step-content');
        if (stepContent) {
            stepContent.textContent = stepText;
            currentPlanSteps[index] = stepText;
        }
    }
    
    // Show the control buttons once steps are added
    showPlanningControls(planningSection, true);
}

/**
 * Setup event listeners for a plan step's edit and delete buttons
 * @param {HTMLElement} stepItem - The step item element
 * @param {number} index - The index of the step
 */
function setupStepEventListeners(stepItem, index) {
    // Edit button
    const editBtn = stepItem.querySelector('.step-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const content = stepItem.querySelector('.step-content');
            const text = content.textContent;
            
            // Replace with editable field
            content.innerHTML = `
                <textarea class="step-edit-field">${text}</textarea>
                <div class="step-edit-actions">
                    <button class="step-save-btn">
                        <span class="material-symbols-outlined">save</span>
                    </button>
                    <button class="step-cancel-btn">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            `;
            
            // Focus the textarea
            const textarea = content.querySelector('textarea');
            textarea.focus();
            
            // Save button
            const saveBtn = content.querySelector('.step-save-btn');
            saveBtn.addEventListener('click', () => {
                const newText = textarea.value.trim();
                if (newText) {
                    content.textContent = newText;
                    currentPlanSteps[index] = newText;
                } else {
                    content.textContent = text; // Restore original
                }
            });
            
            // Cancel button
            const cancelBtn = content.querySelector('.step-cancel-btn');
            cancelBtn.addEventListener('click', () => {
                content.textContent = text; // Restore original
            });
        });
    }
    
    // Delete button
    const deleteBtn = stepItem.querySelector('.step-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            // Animate removal
            stepItem.style.opacity = '0';
            stepItem.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                stepItem.remove();
                // Update the array
                currentPlanSteps.splice(index, 1);
                
                // Update indexes for the remaining steps
                const stepsList = stepItem.parentElement;
                if (stepsList) {
                    Array.from(stepsList.children).forEach((item, idx) => {
                        setupStepEventListeners(item, idx);
                    });
                }
            }, 300);
        });
    }
}

/**
 * Show or hide the planning control buttons
 * @param {HTMLElement} planningSection - The planning section element
 * @param {boolean} show - Whether to show or hide the controls
 */
export function showPlanningControls(planningSection, show) {
    if (!planningSection) return;
    
    const controls = planningSection.querySelectorAll('.planning-controls button');
    controls.forEach(btn => {
        btn.style.display = show ? 'inline-flex' : 'none';
    });
}

/**
 * Setup the planning control buttons event listeners
 * @param {HTMLElement} planningSection - The planning section element
 * @param {Function} onApprove - Callback for when plan is approved
 */
export function setupPlanningControls(planningSection, onApprove) {
    if (!planningSection) return;
    
    // Edit button
    const editBtn = planningSection.querySelector('.planning-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            // Toggle edit mode for all steps
            const steps = planningSection.querySelectorAll('.planning-step');
            steps.forEach(step => {
                step.classList.toggle('editing');
            });
            
            // Toggle button text
            editBtn.innerHTML = editBtn.innerHTML.includes('Edit') ? 
                '<span class="material-symbols-outlined">done</span> Done Editing' : 
                '<span class="material-symbols-outlined">edit</span> Edit Plan';
        });
    }
    
    // Approve button
    const approveBtn = planningSection.querySelector('.planning-approve-btn');
    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            // Disable controls
            showPlanningControls(planningSection, false);
            
            // Show execution status
            showExecutionStatus(planningSection, 'Starting execution...');
            
            // Call the approve callback
            if (typeof onApprove === 'function') {
                isExecutingPlan = true;
                currentStepIndex = 0;
                onApprove(currentPlanSteps);
            }
        });
    }
    
    // Add step button
    const addStepBtn = planningSection.querySelector('.planning-add-step-btn');
    if (addStepBtn) {
        addStepBtn.addEventListener('click', () => {
            addPlanningStep(planningSection, 'New step (click to edit)', undefined, true);
        });
    }
}

/**
 * Show execution status messages
 * @param {HTMLElement} planningSection - The planning section element
 * @param {string} message - The status message to display
 */
export function showExecutionStatus(planningSection, message) {
    if (!planningSection) return;
    
    const statusElem = planningSection.querySelector('.planning-status');
    if (statusElem) {
        statusElem.textContent = message;
        statusElem.style.display = 'block';
    }
}

/**
 * Mark a step as completed during execution
 * @param {HTMLElement} planningSection - The planning section element
 * @param {number} index - The index of the step to mark
 */
export function markStepCompleted(planningSection, index) {
    if (!planningSection) return;
    
    const steps = planningSection.querySelectorAll('.planning-step');
    if (index >= 0 && index < steps.length) {
        steps[index].classList.add('completed');
        currentStepIndex = index + 1;
    }
}

/**
 * Update the execution progress in the UI
 * @param {HTMLElement} planningSection - The planning section element
 * @param {number} index - Current step index being executed
 * @param {string} statusMessage - Status message to display
 */
export function updateExecutionProgress(planningSection, index, statusMessage) {
    // Mark previous steps as completed
    for (let i = 0; i <= index; i++) {
        markStepCompleted(planningSection, i);
    }
    
    // Update status message
    showExecutionStatus(planningSection, statusMessage);
}

/**
 * Finalize the planning section after execution
 * @param {HTMLElement} planningSection - The planning section element
 */
export function finalizePlanExecution(planningSection) {
    if (!planningSection) return;
    
    isExecutingPlan = false;
    showExecutionStatus(planningSection, 'Execution completed!');
    
    // Add a fade-out effect after a few seconds
    setTimeout(() => {
        const statusElem = planningSection.querySelector('.planning-status');
        if (statusElem) {
            statusElem.style.opacity = '0';
            setTimeout(() => {
                statusElem.style.display = 'none';
                statusElem.style.opacity = '1';
            }, 500);
        }
    }, 3000);
}

/**
 * Generate a fake plan for demonstration
 * @param {HTMLElement} planningSection - The planning section element
 * @param {Array} steps - Array of step descriptions
 * @param {number} delay - Delay between steps in ms
 */
export function demoGeneratePlan(planningSection, steps, delay = 1000) {
    // Show thinking animation
    showPlanningThinking(planningSection, true);
    
    // Add steps with delay
    steps.forEach((step, index) => {
        setTimeout(() => {
            addPlanningStep(planningSection, step, undefined, true);
            
            // Hide thinking when last step is added
            if (index === steps.length - 1) {
                showPlanningThinking(planningSection, false);
            }
        }, delay * (index + 1));
    });
} 