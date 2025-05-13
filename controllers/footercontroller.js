



const shippingPage = async(req,res)=>{
  try {
     res.render('shipping')
  } catch (error) {
    console.log(error,'error from shippingPage')
  }
}

const returnPolicyPage = async (req, res) => {
  try {
    res.render('returnPolicyPage')
  } catch (error) {
    console.error(error);
  }
};

const termsAndCondition = async (req, res) => {
  try {
    res.render('termsAndCondition')
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports ={
    shippingPage,
    returnPolicyPage,
    termsAndCondition,
}