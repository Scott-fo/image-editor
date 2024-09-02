class ImageItem {
  constructor(img, x, y, width, height) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.aspectRatio = img.naturalWidth / img.naturalHeight;
  }
}

class ImageEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.images = [];
    this.selectedImage = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragHandle = null;
    this.handleSize = 10;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.isShiftPressed = false;

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

    console.log('ImageEditor initialized');
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
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
        this.images.push(newImage);
        this.selectedImage = newImage;
        console.log('New image added:', newImage);
        this.draw();
        resolve();
      };
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        reject(error);
      };
      img.src = src;
    });
  }

  draw() {
    console.log('Drawing images:', this.images.length);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.images.forEach((img, index) => {
      console.log(`Drawing image ${index}:`, img.x, img.y, img.width, img.height);
      this.ctx.drawImage(img.img, img.x, img.y, img.width, img.height);
    });
    if (this.selectedImage) {
      this.drawHandles(this.selectedImage);
    }
  }

  drawHandles(image) {
    const handles = [
      { x: image.x, y: image.y, cursor: 'nw-resize' },
      { x: image.x + image.width, y: image.y, cursor: 'ne-resize' },
      { x: image.x, y: image.y + image.height, cursor: 'sw-resize' },
      { x: image.x + image.width, y: image.y + image.height, cursor: 'se-resize' }
    ];

    this.ctx.fillStyle = 'blue';
    handles.forEach(handle => {
      this.ctx.fillRect(handle.x - this.handleSize / 2, handle.y - this.handleSize / 2, this.handleSize, this.handleSize);
    });
  }

  getHandle(x, y) {
    if (!this.selectedImage) return null;
    const image = this.selectedImage;
    const handles = [
      { x: image.x, y: image.y, cursor: 'nw-resize' },
      { x: image.x + image.width, y: image.y, cursor: 'ne-resize' },
      { x: image.x, y: image.y + image.height, cursor: 'sw-resize' },
      { x: image.x + image.width, y: image.y + image.height, cursor: 'se-resize' }
    ];

    for (let handle of handles) {
      if (Math.abs(x - handle.x) < this.handleSize / 2 && Math.abs(y - handle.y) < this.handleSize / 2) {
        return handle.cursor;
      }
    }
    return null;
  }

  getImageAtPoint(x, y) {
    for (let i = this.images.length - 1; i >= 0; i--) {
      const img = this.images[i];
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
      this.isResizing = true;
    } else {
      const clickedImage = this.getImageAtPoint(x, y);
      if (clickedImage) {
        this.selectedImage = clickedImage;
        this.isDragging = true;
        this.dragStartX = x - clickedImage.x;
        this.dragStartY = y - clickedImage.y;
        this.images = this.images.filter(img => img !== clickedImage);
        this.images.push(clickedImage);
      } else {
        this.selectedImage = null;
      }
    }
    this.draw();
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isResizing && this.selectedImage) {
      this.resize(this.selectedImage, x, y);
    } else if (this.isDragging && this.selectedImage) {
      this.selectedImage.x = x - this.dragStartX;
      this.selectedImage.y = y - this.dragStartY;
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
    this.dragHandle = null;
  }

  resize(image, x, y) {
    let newWidth, newHeight, anchorX, anchorY;
    switch (this.dragHandle) {
      case 'nw-resize':
        newWidth = image.width + image.x - x;
        newHeight = image.height + image.y - y;
        anchorX = image.x + image.width;
        anchorY = image.y + image.height;
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
      case 'ne-resize':
        image.y = anchorY - newHeight;
        break;
      case 'sw-resize':
        image.x = anchorX - newWidth;
        break;
      case 'se-resize':
        break;
    }

    image.width = newWidth;
    image.height = newHeight;
    this.draw();
  }
}

const editor = new ImageEditor('canvas');

document.getElementById('imageUpload').addEventListener('change', (e) => {
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
});

console.log('Script loaded');
