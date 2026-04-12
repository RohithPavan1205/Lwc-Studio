export type TemplateCategory = 'data-display' | 'form' | 'navigation' | 'utility';

export interface LwcTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  html: string;
  js: string;
  css: string;
}

export const TEMPLATES: LwcTemplate[] = [
  {
    id: 'contact-card',
    name: 'Contact Card',
    description: 'A stylish card to display user profile and contact information.',
    category: 'data-display',
    html: `<template>
    <div class="card">
        <div class="header">
            <h2 class="title">{contactName}</h2>
            <p class="subtitle">{title}</p>
        </div>
        <div class="body">
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Phone:</strong> {phone}</p>
        </div>
    </div>
</template>`,
    js: `import { LightningElement, api } from 'lwc';

export default class __className__ extends LightningElement {
    @api contactName = 'Jane Doe';
    @api title = 'Lead Developer';
    @api email = 'jane.doe@example.com';
    @api phone = '(555) 123-4567';
}`,
    css: `.card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    background: #ffffff;
    padding: 16px;
    max-width: 300px;
    font-family: sans-serif;
    color: #111827;
}
.header { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 12px; }
.title { margin: 0; font-size: 1.25rem; font-weight: 600; color: #111827; }
.subtitle { margin: 4px 0 0; font-size: 0.875rem; color: #6b7280; }
.body p { margin: 4px 0; font-size: 0.875rem; }`
  },
  {
    id: 'data-grid',
    name: 'Data Grid',
    description: 'A simple, responsive table for displaying lists of records.',
    category: 'data-display',
    html: `<template>
    <table class="data-table">
        <thead>
            <tr>
                <template for:each={columns} for:item="col">
                    <th key={col}>{col}</th>
                </template>
            </tr>
        </thead>
        <tbody>
            <template for:each={data} for:item="row">
                <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.status}</td>
                    <td>{row.amount}</td>
                </tr>
            </template>
        </tbody>
    </table>
</template>`,
    js: `import { LightningElement } from 'lwc';

export default class __className__ extends LightningElement {
    columns = ['Name', 'Status', 'Amount'];
    data = [
        { id: 1, name: 'Acme Corp', status: 'Active', amount: '$5,000' },
        { id: 2, name: 'Globex', status: 'Pending', amount: '$3,200' },
        { id: 3, name: 'Initech', status: 'Closed', amount: '$1,500' }
    ];
}`,
    css: `.data-table {
    width: 100%;
    border-collapse: collapse;
    font-family: sans-serif;
}
.data-table th, .data-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
}
.data-table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
.data-table tr:hover { background-color: #f3f4f6; }`
  },
  {
    id: 'login-form',
    name: 'Login Form',
    description: 'A clean authentication form with email and password inputs.',
    category: 'form',
    html: `<template>
    <div class="form-container">
        <h2>Login</h2>
        <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" onchange={handleEmailChange} />
        </div>
        <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" onchange={handlePasswordChange} />
        </div>
        <button class="btn" onclick={handleLogin}>Sign In</button>
    </div>
</template>`,
    js: `import { LightningElement } from 'lwc';

export default class __className__ extends LightningElement {
    email = '';
    password = '';

    handleEmailChange(event) {
        this.email = event.target.value;
    }
    
    handlePasswordChange(event) {
        this.password = event.target.value;
    }

    handleLogin() {
        console.log('Logging in with:', this.email);
        alert('Login attempted for ' + this.email);
    }
}`,
    css: `.form-container {
    max-width: 350px;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    background: #fff;
    font-family: sans-serif;
}
h2 { margin-top: 0; color: #111827; }
.input-group { margin-bottom: 16px; display: flex; flex-direction: column; }
label { font-size: 0.875rem; margin-bottom: 4px; color: #374151; font-weight: 500; }
input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; }
input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2); }
.btn { 
    width: 100%; padding: 10px; background: #0ea5e9; color: white; 
    border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background 0.2s;
}
.btn:hover { background: #0284c7; }`
  },
  {
    id: 'search-bar',
    name: 'Search Engine',
    description: 'A dynamic search bar that filters a list of results as you type.',
    category: 'form',
    html: `<template>
    <div class="container">
        <input 
            type="search" 
            placeholder="Search items..." 
            class="search-input" 
            onkeyup={handleSearch}
        />
        <ul class="results">
            <template for:each={filteredItems} for:item="item">
                <li key={item}>{item}</li>
            </template>
        </ul>
    </div>
</template>`,
    js: `import { LightningElement } from 'lwc';

export default class __className__ extends LightningElement {
    query = '';
    allItems = ['Apple', 'Banana', 'Orange', 'Mango', 'Pineapple', 'Strawberry', 'Grape'];

    get filteredItems() {
        if (!this.query) return this.allItems;
        return this.allItems.filter(item => 
            item.toLowerCase().includes(this.query.toLowerCase())
        );
    }

    handleSearch(event) {
        this.query = event.target.value;
    }
}`,
    css: `.container { font-family: sans-serif; max-width: 400px; }
.search-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
}
.search-input:focus { outline: none; border-color: #6366f1; }
.results { list-style: none; padding: 0; margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.results li { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151; }
.results li:last-child { border-bottom: none; }
.results li:hover { background: #f9fafb; cursor: pointer; }`
  },
  {
    id: 'tabs',
    name: 'Tab Navigation',
    description: 'A horizontal tabbed navigation interface.',
    category: 'navigation',
    html: `<template>
    <div class="tabs">
        <div class="tab-header">
            <template for:each={tabs} for:item="tab">
                <button 
                    key={tab.id} 
                    class={tab.headerClass} 
                    onclick={handleTabClick} 
                    data-id={tab.id}
                >
                    {tab.label}
                </button>
            </template>
        </div>
        <div class="tab-content">
            <p>{currentContent}</p>
        </div>
    </div>
</template>`,
    js: `import { LightningElement, track } from 'lwc';

export default class __className__ extends LightningElement {
    @track activeTabId = 'tab1';

    tabsData = [
        { id: 'tab1', label: 'Overview', content: 'This is the overview section.' },
        { id: 'tab2', label: 'Details', content: 'Here are the intricate details.' },
        { id: 'tab3', label: 'Settings', content: 'Configure your preferences here.' },
    ];

    get tabs() {
        return this.tabsData.map(tab => ({
            ...tab,
            headerClass: this.activeTabId === tab.id ? 'tab-btn active' : 'tab-btn'
        }));
    }

    get currentContent() {
        return this.tabsData.find(t => t.id === this.activeTabId)?.content;
    }

    handleTabClick(event) {
        this.activeTabId = event.target.dataset.id;
    }
}`,
    css: `.tabs { font-family: sans-serif; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
.tab-header { display: flex; background: #f3f4f6; border-bottom: 1px solid #d1d5db; }
.tab-btn {
    padding: 12px 24px; border: none; background: transparent; cursor: pointer;
    font-weight: 500; color: #4b5563; transition: all 0.2s;
}
.tab-btn:hover { background: #e5e7eb; }
.tab-btn.active { background: #fff; color: #2563eb; border-bottom: 2px solid #2563eb; }
.tab-content { padding: 24px; background: #fff; color: #1f2937; }`
  },
  {
    id: 'breadcrumbs',
    name: 'Breadcrumbs',
    description: 'A simple breadcrumb trail for hierarchical navigation.',
    category: 'navigation',
    html: `<template>
    <nav class="breadcrumb">
        <ol>
            <template for:each={crumbs} for:item="crumb">
                <li key={crumb.id} class={crumb.className}>
                    <template if:true={crumb.isLink}>
                        <a href="javascript:void(0);">{crumb.label}</a>
                    </template>
                    <template if:false={crumb.isLink}>
                        <span aria-current="page">{crumb.label}</span>
                    </template>
                </li>
            </template>
        </ol>
    </nav>
</template>`,
    js: `import { LightningElement } from 'lwc';

export default class __className__ extends LightningElement {
    paths = [
        { id: '1', label: 'Home', isLink: true },
        { id: '2', label: 'Products', isLink: true },
        { id: '3', label: 'Electronics', isLink: true },
        { id: '4', label: 'Smartphones', isLink: false }
    ];

    get crumbs() {
        return this.paths.map(path => ({
            ...path,
            className: path.isLink ? 'crumb-item' : 'crumb-item active'
        }));
    }
}`,
    css: `.breadcrumb { font-family: sans-serif; }
.breadcrumb ol { list-style: none; display: flex; padding: 0; margin: 0; }
.crumb-item { display: flex; align-items: center; color: #6b7280; font-size: 0.875rem; }
.crumb-item + .crumb-item::before {
    content: '/'; margin: 0 8px; color: #d1d5db;
}
.crumb-item a { color: #2563eb; text-decoration: none; }
.crumb-item a:hover { text-decoration: underline; }
.crumb-item.active span { font-weight: 600; color: #111827; }`
  },
  {
    id: 'accordion',
    name: 'Accordion',
    description: 'A collapsible section component.',
    category: 'utility',
    html: `<template>
    <div class="accordion">
        <template for:each={sections} for:item="section">
            <div key={section.id} class="section">
                <button class="header" onclick={toggleSection} data-id={section.id}>
                    <span>{section.title}</span>
                    <span>{section.icon}</span>
                </button>
                <div class={section.contentClass}>
                    <p>{section.content}</p>
                </div>
            </div>
        </template>
    </div>
</template>`,
    js: `import { LightningElement, track } from 'lwc';

export default class __className__ extends LightningElement {
    @track activeSectionId = '1';

    data = [
        { id: '1', title: 'What is LWC?', content: 'Lightning Web Components is a newer UI framework.' },
        { id: '2', title: 'Why use it?', content: 'It leverages modern Web Standards and is highly performant.' },
        { id: '3', title: 'Where can it run?', content: 'In Salesforce Platform, Communities, or externally.' }
    ];

    get sections() {
        return this.data.map(sec => {
            const isOpen = this.activeSectionId === sec.id;
            return {
                ...sec,
                icon: isOpen ? '−' : '+',
                contentClass: isOpen ? 'content open' : 'content'
            };
        });
    }

    toggleSection(event) {
        const id = event.currentTarget.dataset.id;
        this.activeSectionId = this.activeSectionId === id ? null : id;
    }
}`,
    css: `.accordion { font-family: sans-serif; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 6px; }
.section { border-bottom: 1px solid #e5e7eb; }
.section:last-child { border-bottom: none; }
.header { 
    width: 100%; display: flex; justify-content: space-between; align-items: center; 
    padding: 16px; background: #f9fafb; border: none; cursor: pointer; color: #111827; font-weight: 600; 
    text-align: left;
}
.header:hover { background: #f3f4f6; }
.content { max-height: 0; overflow: hidden; padding: 0 16px; background: #fff; transition: all 0.3s ease; color: #4b5563; }
.content.open { max-height: 200px; padding: 16px; }`
  },
  {
    id: 'progress',
    name: 'Progress Bar',
    description: 'A visual indicator of task completion.',
    category: 'utility',
    html: `<template>
    <div class="wrapper">
        <div class="labels">
            <span>Uploading</span>
            <span>{percentage}%</span>
        </div>
        <div class="track">
            <div class="fill" style={fillStyle}></div>
        </div>
        <button onclick={increment} class="btn">Increase +</button>
    </div>
</template>`,
    js: `import { LightningElement, track } from 'lwc';

export default class __className__ extends LightningElement {
    @track percentage = 45;

    get fillStyle() {
        return \`width: \${this.percentage}%;\`;
    }

    increment() {
        if (this.percentage < 100) {
            this.percentage += 10;
        }
        if (this.percentage > 100) this.percentage = 100;
    }
}`,
    css: `.wrapper { max-width: 300px; font-family: sans-serif; }
.labels { display: flex; justify-content: space-between; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 8px; }
.track { background: #e5e7eb; height: 8px; border-radius: 99px; overflow: hidden; width: 100%; margin-bottom: 16px; }
.fill { background: #10b981; height: 100%; transition: width 0.3s ease; }
.btn { border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 4px; background: #fff; cursor: pointer; transition: 0.2s; }
.btn:hover { background: #f3f4f6; }`
  }
];
