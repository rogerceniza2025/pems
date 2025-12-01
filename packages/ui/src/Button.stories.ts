export default {
  title: 'UI Components/Button',
  component: 'Button',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Basic Button story
export const Default = {
  render: () => {
    const button = document.createElement('button');
    button.className = 'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90';
    button.textContent = 'Button';
    return button;
  },
};

export const Secondary = {
  render: () => {
    const button = document.createElement('button');
    button.className = 'inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow transition-colors hover:bg-secondary/80';
    button.textContent = 'Secondary';
    return button;
  },
};

export const Destructive = {
  render: () => {
    const button = document.createElement('button');
    button.className = 'inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90';
    button.textContent = 'Destructive';
    return button;
  },
};

export const Outline = {
  render: () => {
    const button = document.createElement('button');
    button.className = 'inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground';
    button.textContent = 'Outline';
    return button;
  },
};

export const Ghost = {
  render: () => {
    const button = document.createElement('button');
    button.className = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground';
    button.textContent = 'Ghost';
    return button;
  },
};