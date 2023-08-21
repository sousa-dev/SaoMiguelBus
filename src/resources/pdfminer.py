import easyocr
reader = easyocr.Reader(['pt']) 
result = reader.readtext('doc/schedule/avm/fromFB/Horários Carreiras Noturnas Capelas (Segunda a Domingo).jpg', detail = 0)
print(result)