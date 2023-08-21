from PIL import Image
from pytesseract import pytesseract
  
# Defining paths to tesseract.exe 
# and the image we would be using
image_path = "doc/schedule/avm/sunday.jpg"
  
# Opening the image & storing it in an image object
img = Image.open(image_path)
  
  
# Passing the image object to 
# image_to_string() function
# This function will
# extract the text from the image
text = pytesseract.image_to_string(img)
  
# Displaying the extracted text
print(text[:-1])