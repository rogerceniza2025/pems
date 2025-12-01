export default {
  title: 'Advanced CSS Features/Tailwind CSS 4',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const ModernButtons = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-4';

    const variants = [
      { name: 'Primary', class: 'bg-blue-500 text-white hover:bg-blue-600' },
      { name: 'Success', class: 'bg-green-500 text-white hover:bg-green-600' },
      { name: 'Warning', class: 'bg-yellow-500 text-white hover:bg-yellow-600' },
      { name: 'Danger', class: 'bg-red-500 text-white hover:bg-red-600' },
    ];

    variants.forEach(variant => {
      const button = document.createElement('button');
      button.className = `px-6 py-3 rounded-lg font-medium transition-colors ${variant.class}`;
      button.textContent = variant.name;
      container.appendChild(button);
    });

    return container;
  },
};

export const CardVariants = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl';

    const cards = [
      { title: 'Basic Card', class: 'bg-white border rounded-lg shadow-sm p-6' },
      { title: 'Elevated Card', class: 'bg-white rounded-lg shadow-lg p-6' },
      { title: 'Outlined Card', class: 'bg-white border-2 rounded-lg p-6' },
      { title: 'Filled Card', class: 'bg-gray-100 rounded-lg p-6' },
    ];

    cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = card.class;

      const title = document.createElement('h3');
      title.className = 'text-lg font-semibold mb-2';
      title.textContent = card.title;

      const content = document.createElement('p');
      content.className = 'text-gray-600';
      content.textContent = 'This is a sample card demonstrating different styling variants using Tailwind CSS 4.';

      cardEl.appendChild(title);
      cardEl.appendChild(content);
      container.appendChild(cardEl);
    });

    return container;
  },
};

export const InputVariants = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-4 max-w-md';

    const inputs = [
      { placeholder: 'Default input', class: 'border border-gray-300 rounded-lg px-4 py-2 w-full' },
      { placeholder: 'Focused state', class: 'border-2 border-blue-500 rounded-lg px-4 py-2 w-full' },
      { placeholder: 'Error state', class: 'border-2 border-red-500 rounded-lg px-4 py-2 w-full' },
      { placeholder: 'Success state', class: 'border-2 border-green-500 rounded-lg px-4 py-2 w-full' },
    ];

    inputs.forEach(input => {
      const inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.placeholder = input.placeholder;
      inputEl.className = input.class;
      container.appendChild(inputEl);
    });

    return container;
  },
};

export const ColorSystem = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-6 max-w-2xl';

    // Background colors
    const bgSection = document.createElement('div');
    bgSection.innerHTML = '<h3 class="text-lg font-semibold mb-3">Background Colors</h3>';
    const bgColors = ['bg-gray-100', 'bg-gray-200', 'bg-blue-100', 'bg-blue-500', 'bg-green-500', 'bg-red-500'];

    const bgGrid = document.createElement('div');
    bgGrid.className = 'grid grid-cols-3 md:grid-cols-6 gap-2';

    bgColors.forEach(color => {
      const colorBox = document.createElement('div');
      colorBox.className = `h-16 w-16 rounded ${color}`;
      bgGrid.appendChild(colorBox);
    });

    bgSection.appendChild(bgGrid);
    container.appendChild(bgSection);

    // Text colors
    const textSection = document.createElement('div');
    textSection.innerHTML = '<h3 class="text-lg font-semibold mb-3">Text Colors</h3>';
    const textColors = [
      { class: 'text-gray-900', text: 'Gray 900' },
      { class: 'text-blue-600', text: 'Blue 600' },
      { class: 'text-green-600', text: 'Green 600' },
      { class: 'text-red-600', text: 'Red 600' },
    ];

    const textGrid = document.createElement('div');
    textGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-2';

    textColors.forEach(color => {
      const textBox = document.createElement('div');
      textBox.className = `p-3 border rounded ${color.class}`;
      textBox.textContent = color.text;
      textGrid.appendChild(textBox);
    });

    textSection.appendChild(textGrid);
    container.appendChild(textSection);

    return container;
  },
};