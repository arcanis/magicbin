export class BackBuffer {
  private backBuffer: Array<Buffer> = [];
  private logBuffer: Array<Buffer> = [];

  public onFlush = new Set<(lines: Array<Buffer>) => void>();

  constructor(private rows: number) {
  }

  clear() {
    this.backBuffer.length = 0;
  }

  setRows(rows: number) {
    this.rows = rows;

    if (this.rows === 0) {
      this.backBuffer.length = 0;
      this.logBuffer.length = 0;
    } else {
      this.backBuffer = this.backBuffer.slice(-this.rows);
    }
  }

  write(data: Buffer) {
    let lastIndex = 0;
    let lineCount = 0;

    let index: number;
    while ((index = data.indexOf(0x0A, lastIndex)) !== -1) {
      this.logBuffer.push(data.slice(lastIndex, index + 1));

      this.backBuffer.push(Buffer.concat(this.logBuffer));
      this.logBuffer.length = 0;

      lastIndex = index + 1;
      lineCount += 1;
    }

    if (lastIndex < data.length)
      this.logBuffer.push(data.slice(lastIndex));

    if (lineCount > 0) {
      const lines = this.backBuffer.slice(-lineCount);
      for (const fn of this.onFlush) {
        fn(lines);
      }
    }
  }

  end() {
    if (this.logBuffer.length > 0)
      this.write(Buffer.from(`\n`));

    this.onFlush.clear();
  }

  read(lines: number) {
    return lines > 0 ? this.backBuffer.slice(-lines) : [];
  }
}
