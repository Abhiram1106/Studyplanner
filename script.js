document.addEventListener('DOMContentLoaded', function() {
    const studyForm = document.getElementById('studyForm');
    const topicsContainer = document.getElementById('topicsContainer');
    const addTopicBtn = document.getElementById('addTopicBtn');
    const togglePlansBtn = document.getElementById('togglePlansBtn');
    const plansContainer = document.getElementById('plansContainer');
    const alertEl = document.querySelector('.alert');
    
    let savedPlans = JSON.parse(localStorage.getItem('studyPlans')) || [];
    
    addTopicBtn.addEventListener('click', function() {
        const topicGroup = document.createElement('div');
        topicGroup.className = 'topic-group';
        topicGroup.innerHTML = `
            <div class="form-group">
                <label>Topic:</label>
                <input type="text" class="topic" placeholder="e.g. Mathematics" required>
            </div>
            <div class="form-group">
                <label>Sub-topics (comma separated):</label>
                <input type="text" class="subtopics" placeholder="e.g. Algebra, Geometry, Calculus">
            </div>
            <div class="form-group">
                <label>Hours Needed:</label>
                <input type="number" class="hoursNeeded" min="1" value="5" required>
            </div>
            <button type="button" class="remove-topic-btn"><i class="fas fa-trash"></i></button>
        `;
        topicsContainer.appendChild(topicGroup);
    });
    
    topicsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-topic-btn') || e.target.closest('.remove-topic-btn')) {
            const topicGroup = e.target.closest('.topic-group');
            if (topicGroup && topicsContainer.children.length > 1) {
                topicGroup.remove();
            }
        }
    });
    
    togglePlansBtn.addEventListener('click', function() {
        plansContainer.classList.toggle('hidden');
        togglePlansBtn.textContent = plansContainer.classList.contains('hidden') ? 
            'Show Previous Plans' : 'Hide Previous Plans';
    });
    
    studyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const examName = document.getElementById('examName').value;
        const examDate = document.getElementById('examDate').value;
        const studyHours = parseInt(document.getElementById('studyHours').value);
        
        if (!examName || !examDate || isNaN(studyHours)) {
            alert('Please fill all required fields');
            return;
        }
        
        const topics = [];
        const topicGroups = document.querySelectorAll('.topic-group');
        
        topicGroups.forEach(group => {
            const topic = group.querySelector('.topic').value;
            const subtopics = group.querySelector('.subtopics').value;
            const hoursNeeded = parseInt(group.querySelector('.hoursNeeded').value);
            
            if (!topic || isNaN(hoursNeeded)) return;
            
            topics.push({
                topic,
                subtopics: subtopics.split(',').map(s => s.trim()).filter(s => s),
                hoursNeeded
            });
        });
        
        if (topics.length === 0) {
            alert('Please add at least one valid topic');
            return;
        }
        
        const studyPlan = createStudyPlan(examName, examDate, studyHours, topics);
        savedPlans.push(studyPlan);
        localStorage.setItem('studyPlans', JSON.stringify(savedPlans));
        
        showAlert('Study plan generated successfully!');
        displayPlans();
        
        studyForm.reset();
        while (topicsContainer.children.length > 1) {
            topicsContainer.lastChild.remove();
        }
    });
    
    function showAlert(message) {
        alertEl.querySelector('span').textContent = message;
        alertEl.classList.add('show');
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 3000);
    }
    
    function displayPlans() {
        plansContainer.innerHTML = '';
        
        if (savedPlans.length === 0) {
            plansContainer.innerHTML = '<p>No study plans saved yet.</p>';
            return;
        }
        
        savedPlans.forEach((plan, index) => {
            const today = new Date();
            const examDate = new Date(plan.examDate);
            const timeDiff = examDate - today;
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            const planCard = document.createElement('div');
            planCard.className = 'plan-card';
            planCard.innerHTML = `
                <button class="delete-plan" data-index="${index}"><i class="fas fa-trash"></i></button>
                <h3>${plan.examName}</h3>
                <div class="exam-date">Exam Date: ${formatDate(plan.examDate)}</div>
                <div class="days-left">${daysLeft > 0 ? `${daysLeft} days left` : 'Exam passed'}</div>
                <div class="flowchart">
                    ${generateFlowchartHTML(plan.schedule)}
                </div>
            `;
            plansContainer.appendChild(planCard);
        });
        
        document.querySelectorAll('.delete-plan').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                savedPlans.splice(index, 1);
                localStorage.setItem('studyPlans', JSON.stringify(savedPlans));
                displayPlans();
                showAlert('Study plan deleted successfully!');
            });
        });
    }
    
    function createStudyPlan(examName, examDate, studyHours, topics) {
        const totalHoursNeeded = topics.reduce((sum, topic) => sum + topic.hoursNeeded, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const examDay = new Date(examDate);
        examDay.setHours(0, 0, 0, 0);
        const timeDiff = examDay - today;
        const daysAvailable = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
        const totalHoursAvailable = daysAvailable * studyHours;
        const adjustmentFactor = totalHoursAvailable / totalHoursNeeded;
        const schedule = [];
        let currentDate = new Date(today);
        
        topics.forEach(topic => {
            const adjustedHours = Math.max(1, Math.floor(topic.hoursNeeded * Math.min(1, adjustmentFactor)));
            let remainingHours = adjustedHours;
            
            while (remainingHours > 0 && currentDate <= examDay) {
                const hoursToday = Math.min(studyHours, remainingHours);
                const dateStr = formatDate(currentDate);
                let daySchedule = schedule.find(item => item.date === dateStr);
                
                if (!daySchedule) {
                    daySchedule = { date: dateStr, topics: [] };
                    schedule.push(daySchedule);
                }
                
                daySchedule.topics.push({
                    name: topic.topic,
                    subtopics: topic.subtopics,
                    hours: hoursToday
                });
                
                remainingHours -= hoursToday;
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        
        return {
            examName,
            examDate,
            studyHours,
            totalHoursNeeded,
            totalHoursAvailable,
            schedule
        };
    }
    
    function generateFlowchartHTML(schedule) {
        if (!schedule || schedule.length === 0) return '<p>No schedule generated</p>';
        
        const examDate = new Date(schedule[schedule.length - 1].date);
        const examDateStr = formatDate(examDate);
        let html = '<div class="flowchart-container">';
        
        html += `
            <div class="flowchart-node start-node">
                <div class="node-content">
                    <div class="node-title">Start Studying</div>
                    <div class="node-date">${formatDate(new Date())}</div>
                </div>
            </div>
            <div class="flowchart-arrow"></div>
        `;
        
        schedule.forEach((day, index) => {
            const isLast = index === schedule.length - 1;
            
            html += `
                <div class="flowchart-node ${isLast ? 'exam-node' : 'study-node'}">
                    <div class="node-content">
                        ${isLast ? 
                            `<div class="node-title">Exam Day!</div>
                             <div class="node-date">${examDateStr}</div>` :
                            `<div class="node-title">Study Day ${index + 1}</div>
                             <div class="node-date">${day.date}</div>
                             <div class="node-topics">
                                 ${day.topics.map(topic => `
                                     <div class="node-topic">
                                         <strong>${topic.name}</strong>
                                         ${topic.hours} hour${topic.hours > 1 ? 's' : ''}
                                         ${topic.subtopics && topic.subtopics.length > 0 ? 
                                             `<div class="node-subtopics">
                                                 ${topic.subtopics.join(', ')}
                                             </div>` : ''}
                                     </div>
                                 `).join('')}
                             </div>`
                        }
                    </div>
                </div>
                ${!isLast ? '<div class="flowchart-arrow"></div>' : ''}
            `;
        });
        
        return html + '</div>';
    }
    
    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    addTopicRow();
    displayPlans();
});