import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * This file exists to satisfy a specific routing requirement or to handle 
 * direct navigation to /src/routes/index.tsx.
 */
const RoutesIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home if someone lands here directly
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div className="hidden">
      user not give his avatar he select from preadded avatars i give you image url add it to avatars some and also have some are availbe for free but some are available only for premium uswers only user select it and confirm and his avatar is added to it then not show this text Profile instead show his profile pic 
here are images url
for free 
1. https://i.pinimg.com/736x/e4/32/12/e43212860a10e5e63c80c2ce5f76f8b3.jpg
2. https://i.pinimg.com/736x/9c/f0/81/9cf08115f983cf802fde44e07b62413d.jpg
for premium users only 
1. https://i.pinimg.com/1200x/dd/f6/46/ddf6466855c93a74ed814ce66860e9a3.jpg
2. https://i.pinimg.com/1200x/b1/ea/85/b1ea858dde1f60b3d7ff7ba62c7739f0.jpg
3. https://i.pinimg.com/736x/15/1b/d1/151bd1fb461ab318a3b06a331c9e5d4d.jpg
4. https://i.pinimg.com/736x/b8/81/01/b88101506ac0d03a27325247d1ef88d0.jpg 
5. https://i.pinimg.com/736x/9f/b1/c6/9fb1c6354e2b4261904d1762a60c2d4e.jpg 
6. https://i.pinimg.com/736x/02/af/aa/02afaabec94dc7ca657480d44c1eab78.jpg
7. https://i.pinimg.com/736x/d7/ea/4b/d7ea4b7cdf6cb72e7e7d1c98df2774aa.jpg
8. https://i.pinimg.com/1200x/c8/6f/2c/c86f2c7160dee9bb73c359051887dc15.jpg
9. https://i.pinimg.com/736x/aa/20/dc/aa20dcdacd49131834639f61f8f8026d.jpg
10. https://i.pinimg.com/736x/41/0c/ca/410ccab41a6ca4aa38a4de35da59bc43.jpg
11. https://i.pinimg.com/736x/46/98/52/469852f2ac6c7ace80f5eb65a61aede2.jpg

for free user also show premium avatars but he can not set him he can only set free avatoars only
    </div>
  );
};

export default RoutesIndex;
