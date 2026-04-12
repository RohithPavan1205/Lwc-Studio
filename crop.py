from PIL import Image

def trim_transparency(img_path):
    img = Image.open(img_path)
    # Get the bounding box of the non-transparent alpha channel
    bbox = img.getbbox()
    if bbox:
       cropped = img.crop(bbox)
       cropped.save(img_path)
       print("Cropped successfully")
    else:
       print("No bbox found")

trim_transparency('public/logo-full.png')
