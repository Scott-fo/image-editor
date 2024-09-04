class EditorItem {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = 0;
  }
}

class ImageItem extends EditorItem {
  constructor(img, x, y, width, height) {
    super(x, y, width, height);
    this.img = img;
    this.aspectRatio = img.naturalWidth / img.naturalHeight;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.drawImage(
      this.img,
      -this.width / 2, -this.height / 2,
      this.width,
      this.height,
    );
    ctx.restore();
  }
}

class TextItem extends EditorItem {
  constructor(text, x, y, width, height) {
    super(x, y, width, height);
    this.text = text;
    this.fontSize = 20;
    this.fontFamily = 'Arial';
    this.color = 'black';
    this.element = this.createTextElement();
    this.updateElement();
  }

  createTextElement() {
    const textarea = document.createElement('textarea');
    textarea.value = this.text;
    textarea.style.position = 'absolute';
    textarea.style.fontSize = this.fontSize + 'px';
    textarea.style.fontFamily = this.fontFamily;
    textarea.style.color = this.color;
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'transparent';
    textarea.style.pointerEvents = 'none';
    textarea.addEventListener('input', () => {
      this.text = textarea.value;
    });
    return textarea;
  }

  updateElement() {
    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';
    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';
    this.element.style.transform = `rotate(${this.rotation}rad)`;
    this.element.style.border = this.isSelected ? '1px dotted #808080' : 'none';
  }

  setSelected(isSelected) {
    this.isSelected = isSelected;
    this.updateElement();
  }
}

class ImageEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.items = [];
    this.selectedItem = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragHandle = null;
    this.handleSize = 10;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.isShiftPressed = false;

    this.textContainer = document.createElement('div');
    this.textContainer.style.position = 'absolute';
    this.textContainer.style.left = this.canvas.offsetLeft + 'px';
    this.textContainer.style.top = this.canvas.offsetTop + 'px';
    this.textContainer.style.width = this.canvas.width + 'px';
    this.textContainer.style.height = this.canvas.height + 'px';
    this.textContainer.style.pointerEvents = 'none';
    this.canvas.parentElement.appendChild(this.textContainer);

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.isShiftPressed = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftPressed = false;
    });

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

    console.log('ImageEditor initialized');
  }

  getItemAtPoint(x, y) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) {
        return item;
      }
    }
    return null;
  }

  serializeState() {
    return JSON.stringify({
      items: this.items.map(item => {
        if (item instanceof ImageItem) {
          return {
            type: 'image',
            src: item.img.src,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation
          };
        } else if (item instanceof TextItem) {
          return {
            type: 'text',
            text: item.element.value,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            color: item.color
          };
        }
      }),
      selectedItemIndex: this.items.indexOf(this.selectedItem)
    });
  }

  async deserializeState(serializedState) {
    const state = JSON.parse(serializedState);
    this.items = [];

    while (this.textContainer.firstChild) {
      this.textContainer.removeChild(this.textContainer.firstChild);
    }

    for (const itemData of state.items) {
      if (itemData.type === 'image') {
        const img = new Image();
        img.src = itemData.src;
        await new Promise(resolve => {
          img.onload = resolve;
        });
        const newItem = new ImageItem(img, itemData.x, itemData.y, itemData.width, itemData.height);
        newItem.rotation = itemData.rotation;
        this.items.push(newItem);
      } else if (itemData.type === 'text') {
        const newItem = new TextItem(itemData.text, itemData.x, itemData.y, itemData.width, itemData.height);
        newItem.rotation = itemData.rotation;
        newItem.fontSize = itemData.fontSize;
        newItem.fontFamily = itemData.fontFamily;
        newItem.color = itemData.color;
        this.items.push(newItem);
        this.textContainer.appendChild(newItem.element);
      }
    }
    this.selectedItem = this.items[state.selectedItemIndex] || null;
    if (this.selectedItem instanceof TextItem) {
      this.selectedItem.setSelected(true);
    }
    this.draw();
  }

  saveToLocalStorage() {
    const serializedState = this.serializeState();
    localStorage.setItem('imageEditorState', serializedState);
  }

  async loadFromLocalStorage() {
    const serializedState = localStorage.getItem('imageEditorState');
    if (serializedState) {
      await this.deserializeState(serializedState);
      this.items.forEach(item => {
        if (item instanceof TextItem && !this.textContainer.contains(item.element)) {
          this.textContainer.appendChild(item.element);
        }
      });
    }
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
    console.log('Canvas resized:', this.canvas.width, this.canvas.height);
  }

  addImage(src) {
    console.log('Adding image:', src);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded:', img.naturalWidth, img.naturalHeight);
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let width, height;
        if (aspectRatio > 1) {
          width = this.canvas.width * 0.4;
          height = width / aspectRatio;
        } else {
          height = this.canvas.height * 0.4;
          width = height * aspectRatio;
        }
        const x = (this.canvas.width - width) / 2;
        const y = (this.canvas.height - height) / 2;
        const newImage = new ImageItem(img, x, y, width, height);
        this.items.push(newImage);
        this.selectedItem = newImage;
        console.log('New image added:', newImage);
        this.draw();
        resolve();
      };
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        reject(error);
      };
      img.src = src;
    }).then(this.saveToLocalStorage());
  }

  addText(text) {
    const newText = new TextItem(text, 50, 50, 200, 100);
    this.items.push(newText);
    this.textContainer.appendChild(newText.element);
    this.selectedItem = newText;
    this.draw();
    this.saveToLocalStorage();
  }

  deleteSelectedItem() {
    if (this.selectedItem) {
      if (this.selectedItem instanceof TextItem) {
        this.textContainer.removeChild(this.selectedItem.element);
      }
      this.items = this.items.filter(item => item !== this.selectedItem);
      this.selectedItem = null;
      this.draw();
      this.saveToLocalStorage();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.items.forEach(item => {
      if (item instanceof ImageItem) {
        item.draw(this.ctx);
      } else if (item instanceof TextItem) {
        item.updateElement();
      }
    });
    if (this.selectedItem) {
      this.drawHandles(this.selectedItem);
    }
  }

  drawHandles(image) {
    const centerX = image.x + image.width / 2;
    const centerY = image.y + image.height / 2;

    const rotatePoint = (x, y, angle) => {
      const dx = x - centerX;
      const dy = y - centerY;
      return {
        x: centerX + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: centerY + dx * Math.sin(angle) + dy * Math.cos(angle)
      };
    };

    const handles = [
      { x: image.x, y: image.y, cursor: 'nw-resize' },
      { x: image.x + image.width, y: image.y + image.height / 2, cursor: 'e-resize' },
      { x: image.x, y: image.y + image.height / 2, cursor: 'w-resize' },
      { x: image.x + image.width, y: image.y, cursor: 'ne-resize' },
      { x: image.x, y: image.y + image.height, cursor: 'sw-resize' },
      { x: image.x + image.width, y: image.y + image.height, cursor: 'se-resize' },
      { x: image.x + image.width / 2, y: image.y - 20, cursor: 'grab' } // Rotation handle
    ].map(handle => {
      const rotated = rotatePoint(handle.x, handle.y, image.rotation);
      return { ...handle, ...rotated };
    });

    this.ctx.fillStyle = 'blue';
    handles.forEach(handle => {
      this.ctx.save();
      this.ctx.translate(handle.x, handle.y);
      this.ctx.rotate(image.rotation);
      this.ctx.fillRect(-this.handleSize / 2, -this.handleSize / 2, this.handleSize, this.handleSize);
      this.ctx.restore();
    });

    const topCenter = rotatePoint(image.x + image.width / 2, image.y, image.rotation);
    const rotationHandle = handles[handles.length - 1];
    this.ctx.beginPath();
    this.ctx.moveTo(topCenter.x, topCenter.y);
    this.ctx.lineTo(rotationHandle.x, rotationHandle.y);
    this.ctx.strokeStyle = 'blue';
    this.ctx.stroke();
  }

  getHandle(x, y) {
    if (!this.selectedItem) return null;
    const image = this.selectedItem;
    const centerX = image.x + image.width / 2;
    const centerY = image.y + image.height / 2;

    const rotatePoint = (px, py, angle) => {
      const dx = px - centerX;
      const dy = py - centerY;
      return {
        x: centerX + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: centerY + dx * Math.sin(angle) + dy * Math.cos(angle)
      };
    };

    const handles = [
      { x: image.x, y: image.y, cursor: 'nw-resize' },
      { x: image.x + image.width, y: image.y + image.height / 2, cursor: 'e-resize' },
      { x: image.x, y: image.y + image.height / 2, cursor: 'w-resize' },
      { x: image.x + image.width, y: image.y, cursor: 'ne-resize' },
      { x: image.x, y: image.y + image.height, cursor: 'sw-resize' },
      { x: image.x + image.width, y: image.y + image.height, cursor: 'se-resize' },
      { x: image.x + image.width / 2, y: image.y - 20, cursor: 'grab' } // Rotation handle
    ].map(handle => {
      const rotated = rotatePoint(handle.x, handle.y, image.rotation);
      return { ...handle, ...rotated };
    });

    for (let handle of handles) {
      if (Math.abs(x - handle.x) < this.handleSize / 2 && Math.abs(y - handle.y) < this.handleSize / 2) {
        return handle.cursor;
      }
    }
    return null;
  }

  getImageAtPoint(x, y) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const img = this.items[i];
      if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
        return img;
      }
    }
    return null;
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.dragHandle = this.getHandle(x, y);
    if (this.dragHandle) {
      if (this.dragHandle === 'grab') {
        this.isRotating = true;
        this.canvas.classList.add('grabbing');
        const centerX = this.selectedItem.x + this.selectedItem.width / 2;
        const centerY = this.selectedItem.y + this.selectedItem.height / 2;
        this.initialAngle = Math.atan2(y - centerY, x - centerX) - this.selectedItem.rotation;
      } else {
        this.isResizing = true;
      }
    } else {
      const clickedItem = this.getItemAtPoint(x, y);
      if (clickedItem) {
        if (this.selectedItem instanceof TextItem) {
          this.selectedItem.element.style.pointerEvents = 'none';
          this.selectedItem.setSelected(false);
        }
        this.selectedItem = clickedItem;
        if (clickedItem instanceof TextItem) {
          clickedItem.setSelected(true);
        }
        this.isDragging = true;
        this.dragStartX = x - clickedItem.x;
        this.dragStartY = y - clickedItem.y;
        this.items = this.items.filter(item => item !== clickedItem);
        this.items.push(clickedItem);
      } else {
        if (this.selectedItem instanceof TextItem) {
          this.selectedItem.element.style.pointerEvents = 'none';
          this.selectedItem.setSelected(false);
        }
        this.selectedItem = null;
      }
    }
    this.draw();
  }

  onDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedItem = this.getItemAtPoint(x, y);
    if (clickedItem instanceof TextItem) {
      clickedItem.element.style.pointerEvents = 'auto';
      clickedItem.element.focus();
      this.selectedItem = clickedItem;
      clickedItem.setSelected(true);
      this.draw();
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isResizing && this.selectedItem) {
      this.resize(this.selectedItem, x, y);
    } else if (this.isRotating && this.selectedItem) {
      const centerX = this.selectedItem.x + this.selectedItem.width / 2;
      const centerY = this.selectedItem.y + this.selectedItem.height / 2;
      const angle = Math.atan2(y - centerY, x - centerX);
      this.selectedItem.rotation = angle - this.initialAngle;
      this.draw();
    } else if (this.isDragging && this.selectedItem) {
      this.selectedItem.x = x - this.dragStartX;
      this.selectedItem.y = y - this.dragStartY;
      this.draw();
    } else {
      const handle = this.getHandle(x, y);
      if (handle) {
        this.canvas.style.cursor = handle;
      } else if (this.getImageAtPoint(x, y)) {
        this.canvas.style.cursor = 'move';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }
  }

  onMouseUp() {
    this.isResizing = false;
    this.isDragging = false;
    this.isRotating = false;
    this.dragHandle = null;
    this.canvas.classList.remove('grabbing');
    this.saveToLocalStorage();
  }

  resize(image, x, y) {
    const centerX = image.x + image.width / 2;
    const centerY = image.y + image.height / 2;

    const rotateBack = (px, py) => {
      const dx = px - centerX;
      const dy = py - centerY;
      return {
        x: centerX + dx * Math.cos(-image.rotation) - dy * Math.sin(-image.rotation),
        y: centerY + dx * Math.sin(-image.rotation) + dy * Math.cos(-image.rotation)
      };
    };

    const rotatedPoint = rotateBack(x, y);
    x = rotatedPoint.x;
    y = rotatedPoint.y;

    let newWidth, newHeight, anchorX, anchorY;
    switch (this.dragHandle) {
      case 'nw-resize':
        newWidth = image.width + image.x - x;
        newHeight = image.height + image.y - y;
        anchorX = image.x + image.width;
        anchorY = image.y + image.height;
        break;
      case 'w-resize':
        newWidth = image.width + image.x - x;
        newHeight = image.height;
        anchorX = image.x + image.width;
        anchorY = image.y;
        break;
      case 'e-resize':
        newWidth = x - image.x;
        newHeight = image.height
        anchorX = image.x
        anchorY = image.y
        break;
      case 'ne-resize':
        newWidth = x - image.x;
        newHeight = image.height + image.y - y;
        anchorX = image.x;
        anchorY = image.y + image.height;
        break;
      case 'sw-resize':
        newWidth = image.width + image.x - x;
        newHeight = y - image.y;
        anchorX = image.x + image.width;
        anchorY = image.y;
        break;
      case 'se-resize':
        newWidth = x - image.x;
        newHeight = y - image.y;
        anchorX = image.x;
        anchorY = image.y;
        break;
    }

    if (this.isShiftPressed) {
      if (newWidth / newHeight > image.aspectRatio) {
        newWidth = newHeight * image.aspectRatio;
      } else {
        newHeight = newWidth / image.aspectRatio;
      }
    }

    newWidth = Math.max(newWidth, 20);
    newHeight = Math.max(newHeight, 20);

    switch (this.dragHandle) {
      case 'nw-resize':
        image.x = anchorX - newWidth;
        image.y = anchorY - newHeight;
        break;
      case 'w-resize':
        image.x = anchorX - newWidth;
        break;
      case 'ne-resize':
        image.y = anchorY - newHeight;
        break;
      case 'sw-resize':
        image.x = anchorX - newWidth;
        break;
      case 'e-resize':
      case 'se-resize':
        break;
    }

    image.width = newWidth;
    image.height = newHeight;
    this.draw();
    this.saveToLocalStorage();
  }
}

const editor = new ImageEditor('canvas');
editor.loadFromLocalStorage().then(() => {
  console.log('Editor state loaded from local storage');
});

const uploadImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      console.log('File read successfully');
      try {
        await editor.addImage(event.target.result);
        console.log('Image added successfully');
      } catch (error) {
        console.error('Error adding image:', error);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };

    reader.readAsDataURL(file);
  };
  input.click();
}

document.getElementById('uploadIcon').addEventListener('click', uploadImage);

document.getElementById('deleteIcon').addEventListener('click', () => {
  editor.deleteSelectedItem();
});

document.getElementById('textIcon').addEventListener('click', () => {
  const text = prompt('Enter text:');
  if (text) {
    editor.addText(text);
  }
});

document.addEventListener('keydown', (event) => {
  if (editor.selectedItem instanceof TextItem) {
    return;
  }

  if (event.key === 'u') {
    return uploadImage();
  }

  if (event.key === 't') {
    const text = prompt('Enter text:');
    if (text) {
      editor.addText(text);
    }

    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();

    if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
      editor.deleteSelectedItem();
    }
  }
});

console.log('Script loaded');
