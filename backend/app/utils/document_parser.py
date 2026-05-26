import io


def parse_document(file_content: bytes, file_type: str) -> str:
    """Extract text from uploaded file based on its type.

    Supported types: pdf, docx, txt, md
    """
    file_type = file_type.lower().strip()

    if file_type == "pdf":
        return _parse_pdf(file_content)
    elif file_type == "docx":
        return _parse_docx(file_content)
    elif file_type in ("txt", "md"):
        return _parse_text(file_content)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _parse_pdf(content: bytes) -> str:
    """Extract text from PDF using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    texts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            texts.append(text)
    return "\n\n".join(texts)


def _parse_docx(content: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(content))
    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text.strip())
    return "\n\n".join(paragraphs)


def _parse_text(content: bytes) -> str:
    """Decode text content (TXT or MD) directly."""
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return content.decode("gbk")
        except UnicodeDecodeError:
            return content.decode("latin-1")
